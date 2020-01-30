import { Eth } from 'web3x-es/eth'
import { Address } from 'web3x-es/address'
import { put, call, takeLatest, all } from 'redux-saga/effects'
import {
  connectWalletSuccess,
  connectWalletFailure,
  CONNECT_WALLET_REQUEST
} from './actions'
import { MANA } from '../../contracts/MANA'
import { Wallet } from './types'
import { fromWei } from 'web3x-es/utils'

export type WalletSagaOptions = {
  MANA_ADDRESS: string
}

export function createWalletSaga(
  options: WalletSagaOptions = {
    MANA_ADDRESS: '0x0f5d2fb29fb7d3cfee444a200298f468908cc942'
  }
) {
  const { MANA_ADDRESS } = options
  function* handleConnectWalletRequest() {
    try {
      const eth = Eth.fromCurrentProvider()
      if (!eth) {
        // this could happen if metamask is not installed
        throw new Error('Could not connect to Ethereum')
      }
      let accounts: Address[] = yield call(() => eth.getAccounts())
      if (accounts.length < 1) {
        yield call(() => (window as any).ethereum.enable())
        accounts = yield call(() => eth.getAccounts())
        if (accounts.length < 1) {
          throw new Error('Could not enable wallet')
        }
      }
      const address = accounts[0]
      const network = yield call(() => eth.getId())
      const ethBalance = yield call(() => eth.getBalance(address))
      const mana = new MANA(eth, Address.fromString(MANA_ADDRESS))
      const manaBalance = yield call(() =>
        mana.methods.balanceOf(address).call()
      )

      const wallet: Wallet = {
        address: address.toString(),
        mana: parseFloat(fromWei(manaBalance, 'ether')),
        eth: parseFloat(fromWei(ethBalance, 'ether')),
        network
      }

      yield put(connectWalletSuccess(wallet))
    } catch (error) {
      yield put(connectWalletFailure(error.message))
    }
  }

  return function* walletSaga() {
    yield all([takeLatest(CONNECT_WALLET_REQUEST, handleConnectWalletRequest)])
  }
}

export const walletSaga = createWalletSaga()
