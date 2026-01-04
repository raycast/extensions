/**
 * Hook for managing favorite/pinned items
 */
import { showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { getStoredFavorites, setStoredFavorites } from "../../lib/storage";

interface UseFavoritesResult {
  favorites: Set<string>;
  isLoading: boolean;
  toggleFavorite: (id: string) => Promise<void>;
  isFavorite: (id: string) => boolean;
}

export function useFavorites(): UseFavoritesResult {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    const loadFavorites = async () => {
      try {
        const stored = await getStoredFavorites();
        if (isMountedRef.current) {
          setFavorites(stored);
          setIsLoading(false);
        }
      } catch (error) {
        console.error("[useFavorites] Failed to load favorites:", error);
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    };

    loadFavorites();

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const toggleFavorite = useCallback(
    async (id: string) => {
      // Compute new set outside of setState
      const newFavorites = new Set(favorites);
      if (newFavorites.has(id)) {
        newFavorites.delete(id);
      } else {
        newFavorites.add(id);
      }

      // Update state immediately for UI responsiveness
      setFavorites(newFavorites);

      // Persist to storage with proper await
      try {
        await setStoredFavorites(newFavorites);
      } catch (error) {
        console.error("[useFavorites] Failed to save favorites:", error);
        // Revert on error
        if (isMountedRef.current) {
          setFavorites(favorites);
          await showToast({
            style: Toast.Style.Failure,
            title: "Failed to save favorite",
          });
        }
      }
    },
    [favorites],
  );

  const isFavorite = useCallback((id: string) => favorites.has(id), [favorites]);

  return {
    favorites,
    isLoading,
    toggleFavorite,
    isFavorite,
  };
}
