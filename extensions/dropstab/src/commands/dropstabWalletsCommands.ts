import { LocalStorage } from "node-localstorage";
import { showToast, Toast } from "@raycast/api";
import { WalletSearchResult } from "../types/walletType";
import { TransactionSearchResult } from "../types/txHashType";

const localStorage = new LocalStorage("/tmp/raycast-scratch");

const FAVORITES_KEY = "favorites";

export const getFavorites = (): (WalletSearchResult | TransactionSearchResult)[] => {
  const savedFavorites = localStorage.getItem(FAVORITES_KEY);
  return savedFavorites ? JSON.parse(savedFavorites) : [];
};

export const addToFavorites = (
  item: WalletSearchResult | TransactionSearchResult,
  favorites: (WalletSearchResult | TransactionSearchResult)[],
  setFavorites: (favorites: (WalletSearchResult | TransactionSearchResult)[]) => void,
) => {
  const newFavorites = [...favorites, item];
  setFavorites(newFavorites);
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(newFavorites));
  showToast(Toast.Style.Success, "Added to Favorites", `${item.name} has been added to your favorites.`);
};

export const removeFromFavorites = (
  item: WalletSearchResult | TransactionSearchResult,
  favorites: (WalletSearchResult | TransactionSearchResult)[],
  setFavorites: (favorites: (WalletSearchResult | TransactionSearchResult)[]) => void,
) => {
  const newFavorites = favorites.filter((favorite) => !(favorite.id === item.id && favorite.network === item.network));
  setFavorites(newFavorites);
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(newFavorites));
  showToast(Toast.Style.Success, "Removed from Favorites", `${item.name} has been removed from your favorites.`);
};

export function isFavorite(
  item: WalletSearchResult | TransactionSearchResult,
  favorites: (WalletSearchResult | TransactionSearchResult)[],
): boolean {
  return favorites.some((favorite) => favorite.id === item.id && favorite.network === item.network);
}
