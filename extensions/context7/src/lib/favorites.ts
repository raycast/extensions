import { LocalStorage } from "@raycast/api";

import type { FavoriteLibrary, LibrarySummary } from "./types";

const FAVORITES_STORAGE_KEY = "favorite-libraries";

export async function getFavoriteLibraries() {
  const rawFavorites = await LocalStorage.getItem<string>(FAVORITES_STORAGE_KEY);

  if (!rawFavorites) {
    return [];
  }

  try {
    const parsedFavorites = JSON.parse(rawFavorites) as FavoriteLibrary[];
    return Array.isArray(parsedFavorites) ? parsedFavorites : [];
  } catch {
    return [];
  }
}

export async function isFavoriteLibrary(libraryId: string) {
  const favorites = await getFavoriteLibraries();
  return favorites.some((favorite) => favorite.id === libraryId);
}

export async function addFavoriteLibrary(library: LibrarySummary) {
  const favorites = await getFavoriteLibraries();

  if (favorites.some((favorite) => favorite.id === library.id)) {
    return favorites;
  }

  const nextFavorites = [...favorites, library];
  await LocalStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(nextFavorites));

  return nextFavorites;
}

export async function removeFavoriteLibrary(libraryId: string) {
  const favorites = await getFavoriteLibraries();
  const nextFavorites = favorites.filter((favorite) => favorite.id !== libraryId);

  await LocalStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(nextFavorites));

  return nextFavorites;
}

export async function toggleFavoriteLibrary(library: LibrarySummary) {
  if (await isFavoriteLibrary(library.id)) {
    return removeFavoriteLibrary(library.id);
  }

  return addFavoriteLibrary(library);
}
