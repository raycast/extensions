import { useState, useEffect, useCallback, useRef } from "react";
import { showToast, Toast } from "@raycast/api";
import {
  getFavorites,
  setFavorites,
  clearFavorites as clearFavoritesStorage,
  validateFavorites as validateFavoritesStorage,
} from "../lib/favorites";
import { MAX_FAVORITES } from "../lib/constants";
import type { UseFavoritesResult, FavoritesData } from "../types";

/**
 * Hook for managing favorite links.
 * Provides favorites data and functions to add/remove/toggle favorites.
 */
export function useFavorites(): UseFavoritesResult {
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  // Track if initial load has been done
  const initialLoadDone = useRef(false);

  /**
   * Load favorites from LocalStorage on mount
   */
  useEffect(() => {
    async function loadFavorites(): Promise<void> {
      if (initialLoadDone.current) return;
      initialLoadDone.current = true;

      try {
        const favorites = await getFavorites();
        if (favorites) {
          setFavoriteIds(new Set(favorites.linkIds));
        }
      } catch {
        // Silently fail - favorites are optional
      } finally {
        setIsLoading(false);
      }
    }

    void loadFavorites();
  }, []);

  /**
   * Add a link to favorites
   */
  const addFavorite = useCallback(
    async (linkId: string): Promise<void> => {
      // Check if already at max
      if (favoriteIds.size >= MAX_FAVORITES) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Favorites Limit Reached",
          message: `Maximum ${MAX_FAVORITES} favorites allowed`,
        });
        return;
      }

      // Optimistic update
      const newFavorites = new Set(favoriteIds);
      newFavorites.add(linkId);
      setFavoriteIds(newFavorites);

      // Persist to storage
      const data: FavoritesData = {
        linkIds: Array.from(newFavorites),
        validatedAt: new Date().toISOString(),
      };
      await setFavorites(data);

      await showToast({
        style: Toast.Style.Success,
        title: "Added to Favorites",
      });
    },
    [favoriteIds],
  );

  /**
   * Remove a link from favorites
   */
  const removeFavorite = useCallback(
    async (linkId: string): Promise<void> => {
      // Optimistic update
      const newFavorites = new Set(favoriteIds);
      newFavorites.delete(linkId);
      setFavoriteIds(newFavorites);

      // Persist to storage
      const data: FavoritesData = {
        linkIds: Array.from(newFavorites),
        validatedAt: new Date().toISOString(),
      };
      await setFavorites(data);

      await showToast({
        style: Toast.Style.Success,
        title: "Removed from Favorites",
      });
    },
    [favoriteIds],
  );

  /**
   * Toggle favorite status of a link
   */
  const toggleFavorite = useCallback(
    async (linkId: string): Promise<void> => {
      if (favoriteIds.has(linkId)) {
        await removeFavorite(linkId);
      } else {
        await addFavorite(linkId);
      }
    },
    [favoriteIds, addFavorite, removeFavorite],
  );

  /**
   * Check if a link is a favorite (O(1) lookup)
   */
  const isFavorite = useCallback(
    (linkId: string): boolean => {
      return favoriteIds.has(linkId);
    },
    [favoriteIds],
  );

  /**
   * Validate favorites against current cache, removing stale entries
   * @returns Number of removed stale favorites
   */
  const validateFavorites = useCallback(
    async (validLinkIds: Set<string>): Promise<number> => {
      const removedCount = await validateFavoritesStorage(validLinkIds);

      if (removedCount > 0) {
        // Update local state
        const newFavorites = new Set(Array.from(favoriteIds).filter((id) => validLinkIds.has(id)));
        setFavoriteIds(newFavorites);

        await showToast({
          style: Toast.Style.Animated,
          title: "Favorites Cleaned Up",
          message: `Removed ${removedCount} stale favorite${removedCount > 1 ? "s" : ""}`,
        });
      }

      return removedCount;
    },
    [favoriteIds],
  );

  /**
   * Clear all favorites
   */
  const clearFavorites = useCallback(async (): Promise<void> => {
    await clearFavoritesStorage();
    setFavoriteIds(new Set());
  }, []);

  return {
    favoriteIds,
    isLoading,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    isFavorite,
    validateFavorites,
    clearFavorites,
  };
}
