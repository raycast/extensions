import type { FavoritesData } from "../types";

/**
 * Filters favorites to only include valid link IDs.
 * @param favorites - Current favorites data
 * @param validLinkIds - Set of currently valid link IDs
 * @returns Object with filtered linkIds and count of removed favorites
 */
export function filterValidFavorites(
  favorites: FavoritesData,
  validLinkIds: Set<string>,
): { validFavorites: string[]; removedCount: number } {
  const validFavorites = favorites.linkIds.filter((id) => validLinkIds.has(id));
  const removedCount = favorites.linkIds.length - validFavorites.length;
  return { validFavorites, removedCount };
}

/**
 * Parses favorites JSON string into FavoritesData object.
 * @param json - JSON string to parse
 * @returns Parsed FavoritesData or null if invalid
 */
export function parseFavorites(json: string): FavoritesData | null {
  try {
    return JSON.parse(json) as FavoritesData;
  } catch {
    return null;
  }
}

/**
 * Creates an empty favorites data structure with current timestamp.
 */
export function createEmptyFavorites(): FavoritesData {
  return {
    linkIds: [],
    validatedAt: new Date().toISOString(),
  };
}

/**
 * Creates favorites data with the given link IDs.
 * @param linkIds - Array of link IDs to include as favorites
 */
export function createFavoritesData(linkIds: string[]): FavoritesData {
  return {
    linkIds,
    validatedAt: new Date().toISOString(),
  };
}
