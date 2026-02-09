import { LocalStorage } from "@raycast/api";
import { Sound } from "../types";
import { removeCachedFile } from "./cacheFiles";

const FAVORITES_KEY = "favorites";

export async function getFavorites(): Promise<Sound[]> {
  const data = await LocalStorage.getItem<string>(FAVORITES_KEY);
  return data ? JSON.parse(data) : [];
}

export async function addFavorite(sound: Sound): Promise<void> {
  const favorites = await getFavorites();
  if (!favorites.find((f) => f.id === sound.id)) {
    favorites.push(sound);
    await LocalStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  }
}

/** Update the local path of a favorite (after download). */
export async function updateFavoriteLocalPath(soundId: string, localPath: string): Promise<void> {
  const favorites = await getFavorites();
  const updated = favorites.map((f) => (f.id === soundId ? { ...f, localPath } : f));
  await LocalStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
}

export async function removeFavorite(soundId: string): Promise<void> {
  const favorites = await getFavorites();
  const sound = favorites.find((f) => f.id === soundId);
  if (sound) {
    await removeCachedFile(sound).catch(() => {});
  }
  const updated = favorites.filter((f) => f.id !== soundId);
  await LocalStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
}

export async function isFavorite(soundId: string): Promise<boolean> {
  const favorites = await getFavorites();
  return favorites.some((f) => f.id === soundId);
}

export async function toggleFavorite(sound: Sound): Promise<boolean> {
  const favorites = await getFavorites();
  const exists = favorites.some((f) => f.id === sound.id);
  if (exists) {
    await removeFavorite(sound.id);
    return false;
  } else {
    await addFavorite(sound);
    return true;
  }
}
