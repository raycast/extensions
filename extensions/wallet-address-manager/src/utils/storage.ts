import { LocalStorage } from "@raycast/api";

export interface WalletInfo {
  name: string;
  address: string;
}

export async function saveWallet(wallet: WalletInfo) {
  const existingWallets = await getWallets();
  existingWallets.push(wallet);
  await LocalStorage.setItem("wallets", JSON.stringify(existingWallets));
}

export async function getWallets(): Promise<WalletInfo[]> {
  const walletsStr = await LocalStorage.getItem("wallets");
  return walletsStr ? JSON.parse(walletsStr as string) : [];
}

export async function searchWallets(query: string): Promise<WalletInfo[]> {
  const wallets = await getWallets();
  return wallets.filter(
    (wallet) =>
      wallet.name.toLowerCase().includes(query.toLowerCase()) ||
      wallet.address.toLowerCase().includes(query.toLowerCase()),
  );
}
