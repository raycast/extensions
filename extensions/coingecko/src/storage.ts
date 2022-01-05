import { getLocalStorageItem, setLocalStorageItem } from "@raycast/api";

const KEY_FAVORITES = "favorites";

export async function getFavorites(): Promise<string[]> {
  const favoriteString = (await getLocalStorageItem(KEY_FAVORITES)) || "[]";
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
  await setLocalStorageItem(KEY_FAVORITES, newFavoriteString);
}
