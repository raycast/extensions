import { LocalStorage } from "@raycast/api";

const KEY_FAVORITES = "favorites";
const KEY_SHOW_FAVORITES = "show_favorites";

export async function getFavorites(): Promise<string[]> {
  const favoriteString = (await LocalStorage.getItem(KEY_FAVORITES)) || "[]";
  return JSON.parse(favoriteString.toString());
}

export async function addFavorite(id: string) {
  const favorites = await getFavorites();
  if (favorites.includes(id)) {
    return;
  }
  favorites.push(id);
  await setFavorites(favorites);
}

export async function removeFavorite(id: string) {
  const favorites = await getFavorites();
  if (!favorites.includes(id)) {
    return;
  }
  favorites.splice(favorites.indexOf(id), 1);
  await setFavorites(favorites);
}

async function setFavorites(favorites: string[]) {
  const newFavoriteString = JSON.stringify(favorites);
  await LocalStorage.setItem(KEY_FAVORITES, newFavoriteString);
}

export async function setShowFavoritesInCoinList(showFavorites: boolean) {
  await LocalStorage.setItem(KEY_SHOW_FAVORITES, showFavorites);
}

export async function getShowFavoritesInCoinList() {
  const showFavorites = (await LocalStorage.getItem(KEY_SHOW_FAVORITES)) || false;
  return showFavorites ? true : false;
}
