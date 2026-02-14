import { LocalStorage } from "@raycast/api";

const STORAGE_KEY = "tureng-favorites";

export async function getFavorites(): Promise<string[]> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function addFavorite(word: string): Promise<void> {
  const favorites = await getFavorites();
  if (!favorites.includes(word)) {
    favorites.unshift(word);
    await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
  }
}

export async function removeFavorite(word: string): Promise<void> {
  const favorites = await getFavorites();
  const filtered = favorites.filter((f) => f !== word);
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}
