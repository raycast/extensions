import { LocalStorage } from "@raycast/api";

import type { Wallet } from "./types";
import {
  ACTIVE_WALLET_KEY,
  FAVORITES_KEY,
  WALLETS_KEY,
  parseStoredFavorites,
  parseStoredWallets,
  serializeFavorites,
  serializeWallets,
} from "./storage";

export async function getStoredWallets(): Promise<Wallet[]> {
  return parseStoredWallets(await LocalStorage.getItem<string>(WALLETS_KEY));
}

export async function setStoredWallets(wallets: Wallet[]): Promise<void> {
  await LocalStorage.setItem(WALLETS_KEY, serializeWallets(wallets));
}

export async function getStoredFavorites(): Promise<string[]> {
  return parseStoredFavorites(await LocalStorage.getItem<string>(FAVORITES_KEY));
}

export async function setStoredFavorites(favorites: string[]): Promise<void> {
  await LocalStorage.setItem(FAVORITES_KEY, serializeFavorites(favorites));
}

export async function getActiveWalletId(): Promise<string | undefined> {
  const value = await LocalStorage.getItem<string>(ACTIVE_WALLET_KEY);
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export async function setActiveWalletId(walletId: string): Promise<void> {
  await LocalStorage.setItem(ACTIVE_WALLET_KEY, walletId);
}
