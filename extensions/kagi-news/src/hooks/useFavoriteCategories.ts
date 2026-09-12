// Hook to manage favorite categories (only used for the daily news command right now)

import { useCachedState } from "@raycast/utils";
import { useCallback } from "react";

const STORAGE_KEY = "favorite-categories";

export function useFavoriteCategories() {
  const [favorites, setFavorites] = useCachedState<string[]>(STORAGE_KEY, []);

  const addFavorite = useCallback(
    async (categoryId: string) => {
      if (!favorites.includes(categoryId)) {
        const updated = [...favorites, categoryId];
        setFavorites(updated);
      }
    },
    [favorites, setFavorites],
  );

  const removeFavorite = useCallback(
    async (categoryId: string) => {
      const updated = favorites.filter((id) => id !== categoryId);
      setFavorites(updated);
    },
    [favorites, setFavorites],
  );

  const isFavorite = useCallback((categoryId: string) => favorites.includes(categoryId), [favorites]);

  const toggleFavorite = useCallback(
    async (categoryId: string) => {
      if (isFavorite(categoryId)) {
        await removeFavorite(categoryId);
      } else {
        await addFavorite(categoryId);
      }
    },
    [isFavorite, removeFavorite, addFavorite],
  );

  return {
    favorites,
    addFavorite,
    removeFavorite,
    isFavorite,
    toggleFavorite,
  };
}
