import { LocalStorage } from "@raycast/api";
import { CACHE_KEYS } from "./constants";
import { parseFavorites, filterValidFavorites, createFavoritesData } from "./favorites-utils";
import type { FavoritesData } from "../types";

// Re-export pure utilities for convenience
export { createEmptyFavorites, createFavoritesData, filterValidFavorites, parseFavorites } from "./favorites-utils";

/**
 * Retrieves favorites data from LocalStorage
 */
export async function getFavorites(): Promise<FavoritesData | null> {
  const stored = await LocalStorage.getItem<string>(CACHE_KEYS.FAVORITES);
  if (!stored) return null;
  return parseFavorites(stored);
}

/**
 * Stores favorites data in LocalStorage
 */
export async function setFavorites(data: FavoritesData): Promise<void> {
  await LocalStorage.setItem(CACHE_KEYS.FAVORITES, JSON.stringify(data));
}

/**
 * Clears all favorites from LocalStorage
 */
export async function clearFavorites(): Promise<void> {
  await LocalStorage.removeItem(CACHE_KEYS.FAVORITES);
}

/**
 * Validates favorites against a set of valid link IDs.
 * Removes any favorites that are no longer valid (i.e., link was deleted).
 * @param validLinkIds - Set of currently valid link IDs from cache
 * @returns Number of removed stale favorites
 */
export async function validateFavorites(validLinkIds: Set<string>): Promise<number> {
  const favorites = await getFavorites();
  if (!favorites || favorites.linkIds.length === 0) {
    return 0;
  }

  const { validFavorites, removedCount } = filterValidFavorites(favorites, validLinkIds);

  // Always update to refresh timestamp
  await setFavorites(createFavoritesData(validFavorites));

  return removedCount;
}
