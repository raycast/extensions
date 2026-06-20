import { LocalStorage } from "@raycast/api";
import { Favorite } from "../types/word";

const FAVORITES_KEY = "favorites";

export async function getFavorites(): Promise<Favorite[]> {
  const raw = await LocalStorage.getItem<string>(FAVORITES_KEY);
  if (!raw) return [];

  try {
    return JSON.parse(raw) as Favorite[];
  } catch {
    return [];
  }
}

export async function isFavorite(word: string): Promise<boolean> {
  const normalizedWord = word.toLowerCase();
  const favorites = await getFavorites();
  return favorites.some((favorite) => favorite.word.toLowerCase() === normalizedWord);
}

export async function toggleFavorite(word: string): Promise<boolean> {
  const normalizedWord = word.trim().toLowerCase();
  const favorites = await getFavorites();
  const exists = favorites.some((favorite) => favorite.word.toLowerCase() === normalizedWord);
  const nextFavorites = exists
    ? favorites.filter((favorite) => favorite.word.toLowerCase() !== normalizedWord)
    : [{ word: normalizedWord, createdAt: new Date().toISOString() }, ...favorites];

  await LocalStorage.setItem(FAVORITES_KEY, JSON.stringify(nextFavorites));
  return !exists;
}
