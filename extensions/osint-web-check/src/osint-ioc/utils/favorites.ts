/**
 * Favorites Management Utilities
 *
 * Manages favorite OSINT sources for quick access
 */

import { LocalStorage } from "@raycast/api";

const FAVORITES_KEY = "osint-favorites";

/**
 * Get all favorite source IDs
 */
export async function getFavorites(): Promise<string[]> {
  const favoritesJson = await LocalStorage.getItem<string>(FAVORITES_KEY);
  if (!favoritesJson) {
    return [];
  }

  try {
    const parsed = JSON.parse(favoritesJson);
    return Array.isArray(parsed) && parsed.every((item) => typeof item === "string") ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Add a source to favorites
 */
export async function addFavorite(sourceId: string): Promise<void> {
  const favorites = await getFavorites();
  if (!favorites.includes(sourceId)) {
    favorites.push(sourceId);
    await LocalStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  }
}

/**
 * Remove a source from favorites
 */
export async function removeFavorite(sourceId: string): Promise<void> {
  const favorites = await getFavorites();
  const filtered = favorites.filter((id) => id !== sourceId);
  await LocalStorage.setItem(FAVORITES_KEY, JSON.stringify(filtered));
}

/**
 * Check if a source is favorited
 */
export async function isFavorite(sourceId: string): Promise<boolean> {
  const favorites = await getFavorites();
  return favorites.includes(sourceId);
}

/**
 * Toggle favorite status
 */
export async function toggleFavorite(sourceId: string): Promise<boolean> {
  const isFav = await isFavorite(sourceId);
  if (isFav) {
    await removeFavorite(sourceId);
    return false;
  } else {
    await addFavorite(sourceId);
    return true;
  }
}
