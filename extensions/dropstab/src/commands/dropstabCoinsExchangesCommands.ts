import { LocalStorage } from "node-localstorage";
import { showToast, Toast } from "@raycast/api";
import { MarketDetail } from "../types/coinExchangeType";

export const localStorage = new LocalStorage("/tmp/raycast-scratch/coin-exchanges");

export const getFavorites = (key: string): MarketDetail[] => {
  const favorites = localStorage.getItem(key);
  return favorites ? JSON.parse(favorites) : [];
};

export const addToFavorites = (
  item: MarketDetail,
  favorites: MarketDetail[],
  setFavorites: React.Dispatch<React.SetStateAction<MarketDetail[]>>,
  key: string,
) => {
  const updatedFavorites = [...favorites, item];
  setFavorites(updatedFavorites);
  localStorage.setItem(key, JSON.stringify(updatedFavorites));
  showToast(Toast.Style.Success, "Added to Favorites");
};

export const removeFromFavoritesForExchanges = (
  item: MarketDetail,
  favorites: MarketDetail[],
  setFavorites: React.Dispatch<React.SetStateAction<MarketDetail[]>>,
  key: string,
) => {
  const updatedFavorites = favorites.filter((fav) => fav.id !== item.id);
  setFavorites(updatedFavorites);
  localStorage.setItem(key, JSON.stringify(updatedFavorites));
  showToast(Toast.Style.Success, "Removed from Favorites");
};
