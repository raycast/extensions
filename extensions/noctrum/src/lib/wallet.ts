import { LocalStorage } from "@raycast/api";
import { ethers } from "ethers";

const WALLET_KEY = "noctrum-wallet-pk";

export interface WalletData {
  address: string;
  privateKey: string;
}

export async function getStoredWallet(): Promise<WalletData | null> {
  const pk = await LocalStorage.getItem<string>(WALLET_KEY);
  if (!pk) return null;
  const w = new ethers.Wallet(pk);
  return { address: w.address, privateKey: pk };
}

export async function storeWallet(privateKey: string): Promise<WalletData> {
  const w = new ethers.Wallet(privateKey);
  await LocalStorage.setItem(WALLET_KEY, privateKey);
  return { address: w.address, privateKey };
}

export async function createWallet(): Promise<WalletData> {
  const w = ethers.Wallet.createRandom();
  return storeWallet(w.privateKey);
}

export async function deleteWallet(): Promise<void> {
  await LocalStorage.removeItem(WALLET_KEY);
}

export function getSigner(pk: string, rpcUrl: string): ethers.Wallet {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  return new ethers.Wallet(pk, provider);
}
