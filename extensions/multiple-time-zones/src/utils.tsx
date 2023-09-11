import { LocalStorage } from "@raycast/api";

export let favorites: string[] = [];

/**
 * Delays the execution of code by the specified number of milliseconds.
 *
 * @param {number} ms - The number of milliseconds to delay the execution.
 * @return {Promise<void>} A Promise that resolves after the specified delay.
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getFavorite() {
  const favoritesFromLocalStorage = await LocalStorage.getItem("favorites");
  if (!favoritesFromLocalStorage) {
    favorites = [];
  } else if (typeof favoritesFromLocalStorage === "string") {
    favorites = favoritesFromLocalStorage.split(",");
  } else {
    favorites = [];
  }
  return favorites;
}

export async function addFavorite(timezone: string) {
  await getFavorite();
  favorites.push(timezone);
  await LocalStorage.setItem("favorites", favorites.join(","));
}

export async function removeFavorite(timezone: string) {
  await getFavorite();
  if (!favorites.includes(timezone)) {
    return;
  }
  favorites.splice(favorites.indexOf(timezone), 1);
  await LocalStorage.setItem("favorites", favorites.join(","));
}
