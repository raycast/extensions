import type { FormatItem } from "./data";
import { LocalStorage } from "@raycast/api";

interface RawFavorite {
  stack: FavoriteItem[];
}

export interface Favorite {
  id: number;
  stack: FavoriteItem[];
}

export interface FavoriteItem {
  character: string;
}

export type FavoriteCallback = (favorites: Favorite[]) => any;

let favorites: RawFavorite[];
const callbacks: FavoriteCallback[] = [];

export function onFavorites(callback: FavoriteCallback) {
  callbacks.push(callback);
}

async function notifyCallbacks() {
  const favorites = await getFavorites();
  callbacks.forEach((callback) => callback(favorites));
}

export async function getFavorites(): Promise<Favorite[]> {
  if (!favorites) {
    const items = (await LocalStorage.getItem("favorites")) || "[]";
    favorites = JSON.parse(<string>items);
  }

  return favorites.map((favorite, id: number) => ({ id, ...favorite }));
}

async function saveFavorites(next: RawFavorite[]) {
  favorites = next;
  await LocalStorage.setItem("favorites", JSON.stringify(favorites));
  await notifyCallbacks();

  return true;
}

export async function addFavorite(stack: (FormatItem | FavoriteItem)[]) {
  await getFavorites();

  await saveFavorites([
    ...favorites,
    {
      stack: stack.map(({ character }) => ({ character })),
    },
  ]);
}

export async function removeFavorite(id: number) {
  await saveFavorites(favorites.filter((favorite, index) => index !== id));
}
