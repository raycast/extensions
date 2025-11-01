import { LocalStorage } from "node-localstorage";
import { showToast, Toast } from "@raycast/api";
import { SearchResult } from "../types/coinType";

export const localStorage = new LocalStorage("/tmp/raycast-scratch");

export const getFavorites = (key: string): SearchResult[] => {
  const savedFavorites = localStorage.getItem(key);
  return savedFavorites ? JSON.parse(savedFavorites) : [];
};

export const addToFavorites = (
  item: SearchResult,
  favorites: SearchResult[],
  setFavorites: (favorites: SearchResult[]) => void,
  key: string,
) => {
  const newFavorites = [...favorites, item];
  setFavorites(newFavorites);
  localStorage.setItem(key, JSON.stringify(newFavorites));
  showToast(Toast.Style.Success, "Added to Favorites", `${item.name} has been added to your favorites.`);
};

export const removeFromFavoritesForCoins = (
  item: SearchResult,
  favorites: SearchResult[],
  setFavorites: (favorites: SearchResult[]) => void,
  key: string,
) => {
  const newFavorites = favorites.filter((favorite) => favorite.id !== item.id);
  setFavorites(newFavorites);
  localStorage.setItem(key, JSON.stringify(newFavorites));
  showToast(Toast.Style.Success, "Removed from Favorites", `${item.name} has been removed from your favorites.`);
};

export const removeFromFavoritesForWallets = (
  item: SearchResult,
  favorites: SearchResult[],
  setFavorites: (favorites: SearchResult[]) => void,
  key: string,
) => {
  const newFavorites = favorites.filter((favorite) => !(favorite.id === item.id && favorite.network === item.network));
  setFavorites(newFavorites);
  localStorage.setItem(key, JSON.stringify(newFavorites));
  showToast(Toast.Style.Success, "Removed from Favorites", `${item.name} has been removed from your favorites.`);
};

export const isFavoriteForCoins = (item: SearchResult, favorites: SearchResult[]): boolean => {
  return favorites.some((favorite) => favorite.id === item.id);
};
