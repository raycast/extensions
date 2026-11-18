import { showToast, Toast } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useCallback } from "react";
import { randomUUID } from "crypto";
import { FavoriteQuery } from "../api/types";

const FAVORITES_KEY = "shodan_favorites";

export function useFavorites() {
  const [favorites, setFavorites] = useCachedState<FavoriteQuery[]>(
    FAVORITES_KEY,
    [],
  );

  const addFavorite = useCallback(
    async (
      name: string,
      query: string,
      description?: string,
    ): Promise<void> => {
      // Check for duplicates
      if (favorites.some((f) => f.query === query)) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Query Already Saved",
          message: "This query is already in your favorites.",
        });
        return;
      }

      const newFavorite: FavoriteQuery = {
        id: randomUUID(),
        name,
        query,
        description,
        createdAt: new Date().toISOString(),
        useCount: 0,
      };

      const updated = [...favorites, newFavorite];
      setFavorites(updated);

      await showToast({
        style: Toast.Style.Success,
        title: "Query Saved",
        message: `"${name}" added to favorites.`,
      });
    },
    [favorites, setFavorites],
  );

  const removeFavorite = useCallback(
    async (id: string): Promise<void> => {
      const updated = favorites.filter((f) => f.id !== id);
      setFavorites(updated);

      await showToast({
        style: Toast.Style.Success,
        title: "Query Removed",
        message: "Favorite query has been removed.",
      });
    },
    [favorites, setFavorites],
  );

  const updateFavorite = useCallback(
    async (id: string, updates: Partial<FavoriteQuery>): Promise<void> => {
      const updated = favorites.map((f) =>
        f.id === id ? { ...f, ...updates } : f,
      );
      setFavorites(updated);
    },
    [favorites, setFavorites],
  );

  const recordUsage = useCallback(
    async (id: string): Promise<void> => {
      const favorite = favorites.find((f) => f.id === id);
      if (favorite) {
        await updateFavorite(id, {
          lastUsed: new Date().toISOString(),
          useCount: favorite.useCount + 1,
        });
      }
    },
    [favorites, updateFavorite],
  );

  const renameFavorite = useCallback(
    async (id: string, newName: string): Promise<void> => {
      await updateFavorite(id, { name: newName });
      await showToast({
        style: Toast.Style.Success,
        title: "Favorite Renamed",
        message: `Query renamed to "${newName}".`,
      });
    },
    [updateFavorite],
  );

  return {
    favorites,
    addFavorite,
    removeFavorite,
    updateFavorite,
    recordUsage,
    renameFavorite,
    isLoading: false,
  };
}
