// src/hooks/useFavorites.ts
import { LocalStorage } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState, useEffect, useCallback } from "react";

const FAVORITES_KEY = "favoriteStationIds";

export function useFavorites() {
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadFavorites() {
      try {
        setIsLoading(true);
        const storedFavorites = await LocalStorage.getItem<string>(FAVORITES_KEY);
        if (isMounted) {
          setFavoriteIds(storedFavorites ? new Set(JSON.parse(storedFavorites)) : new Set());
        }
      } catch (error) {
        if (isMounted) {
          showFailureToast(error, { title: "Failed to load favorites" });
          setFavoriteIds(new Set()); // Default to empty set on error
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadFavorites();

    return () => {
      isMounted = false; // Prevent state updates on unmounted component
    };
  }, []); // Run only once on mount

  const saveFavorites = useCallback(async (ids: Set<string>) => {
    try {
      await LocalStorage.setItem(FAVORITES_KEY, JSON.stringify(Array.from(ids)));
    } catch (error) {
      showFailureToast(error, { title: "Failed to save favorites" });
    }
  }, []);

  const addFavorite = useCallback(
    (stationId: string) => {
      setFavoriteIds((prev) => {
        const newSet = new Set(prev);
        newSet.add(stationId);
        saveFavorites(newSet); // Save immediately
        return newSet;
      });
    },
    [saveFavorites],
  );

  const removeFavorite = useCallback(
    (stationId: string) => {
      setFavoriteIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(stationId);
        saveFavorites(newSet); // Save immediately
        return newSet;
      });
    },
    [saveFavorites],
  );

  const isFavorite = useCallback((stationId: string) => favoriteIds.has(stationId), [favoriteIds]);

  return {
    favoriteIds,
    isLoadingFavorites: isLoading,
    addFavorite,
    removeFavorite,
    isFavorite,
  };
}
