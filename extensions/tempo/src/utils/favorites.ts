import { LocalStorage } from "@raycast/api";

const FAVORITES_KEY = "tempo-favorites";

export interface FavoriteIssue {
  key: string;
  summary: string;
  addedAt: string;
}

/**
 * Get all favorite issues from local storage
 */
export async function getFavorites(): Promise<FavoriteIssue[]> {
  try {
    const favoritesJson = await LocalStorage.getItem<string>(FAVORITES_KEY);
    if (!favoritesJson) {
      return [];
    }
    return JSON.parse(favoritesJson) as FavoriteIssue[];
  } catch (error) {
    console.error("Error getting favorites:", error);
    return [];
  }
}

/**
 * Add an issue to favorites
 */
export async function addToFavorites(key: string, summary: string): Promise<void> {
  const favorites = await getFavorites();

  // Check if already in favorites
  if (favorites.some((fav) => fav.key === key)) {
    return;
  }

  const newFavorite: FavoriteIssue = {
    key,
    summary,
    addedAt: new Date().toISOString(),
  };

  favorites.unshift(newFavorite);
  await LocalStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
}

/**
 * Remove an issue from favorites
 */
export async function removeFromFavorites(key: string): Promise<void> {
  const favorites = await getFavorites();
  const filtered = favorites.filter((fav) => fav.key !== key);
  await LocalStorage.setItem(FAVORITES_KEY, JSON.stringify(filtered));
}

/**
 * Check if an issue is in favorites
 */
export async function isFavorite(key: string): Promise<boolean> {
  const favorites = await getFavorites();
  return favorites.some((fav) => fav.key === key);
}
