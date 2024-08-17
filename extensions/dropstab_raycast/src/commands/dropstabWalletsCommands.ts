import { LocalStorage } from "node-localstorage";
import { showToast, Toast } from "@raycast/api";
import { WalletSearchResult } from "../types/walletType";

const localStorage = new LocalStorage("/tmp/raycast-scratch");

export const getFavorites = (key: string): WalletSearchResult[] => {
  const savedFavorites = localStorage.getItem(key);
  return savedFavorites ? JSON.parse(savedFavorites) : [];
};

export const addToFavorites = (
  item: WalletSearchResult,
  favorites: WalletSearchResult[],
  setFavorites: (favorites: WalletSearchResult[]) => void,
  key: string,
) => {
  const newFavorites = [...favorites, item];
  setFavorites(newFavorites);
  localStorage.setItem(key, JSON.stringify(newFavorites));
  showToast(Toast.Style.Success, "Added to Favorites", `${item.name} has been added to your favorites.`);
};

export const removeFromFavoritesForCoins = (
  item: WalletSearchResult,
  favorites: WalletSearchResult[],
  setFavorites: (favorites: WalletSearchResult[]) => void,
  key: string,
) => {
  const newFavorites = favorites.filter((favorite) => favorite.id !== item.id);
  setFavorites(newFavorites);
  localStorage.setItem(key, JSON.stringify(newFavorites));
  showToast(Toast.Style.Success, "Removed from Favorites", `${item.name} has been removed from your favorites.`);
};

export const removeFromFavoritesForWallets = (
  item: WalletSearchResult,
  favorites: WalletSearchResult[],
  setFavorites: (favorites: WalletSearchResult[]) => void,
  key: string,
) => {
  const newFavorites = favorites.filter((favorite) => !(favorite.id === item.id && favorite.network === item.network));
  setFavorites(newFavorites);
  localStorage.setItem(key, JSON.stringify(newFavorites));
  showToast(Toast.Style.Success, "Removed from Favorites", `${item.name} has been removed from your favorites.`);
};

export function isFavoriteForWallets(item: WalletSearchResult, favorites: WalletSearchResult[]): boolean {
  return favorites.some((favorite) => favorite.id === item.id && favorite.network === item.network);
}
