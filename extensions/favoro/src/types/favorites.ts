/**
 * Stored favorites data structure
 */
export interface FavoritesData {
  /** Array of favorite link IDs */
  linkIds: string[];
  /** Timestamp when favorites were last validated */
  validatedAt: string;
}

/**
 * Favorites hook return type
 */
export interface UseFavoritesResult {
  /** Set of favorite link IDs for O(1) lookup */
  favoriteIds: Set<string>;
  /** Whether favorites are loading */
  isLoading: boolean;
  /** Add a link to favorites */
  addFavorite: (linkId: string) => Promise<void>;
  /** Remove a link from favorites */
  removeFavorite: (linkId: string) => Promise<void>;
  /** Toggle favorite status */
  toggleFavorite: (linkId: string) => Promise<void>;
  /** Check if a link is a favorite */
  isFavorite: (linkId: string) => boolean;
  /** Validate favorites against current cache */
  validateFavorites: (validLinkIds: Set<string>) => Promise<number>;
  /** Clear all favorites */
  clearFavorites: () => Promise<void>;
}
