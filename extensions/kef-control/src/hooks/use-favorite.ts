import { useCallback, useSyncExternalStore, useEffect, useMemo } from "react";
import { useLocalStorage } from "@raycast/utils";
import { favoriteStore } from "../stores/favorite-store";

export const useFavorite = (kind: "volume" | "source") => {
  const { value, setValue } = useLocalStorage<number[]>(`favorites:${kind}`);

  useEffect(() => {
    if (value) {
      favoriteStore.initialize(value);
    }
  }, [value]);

  const favorites = useSyncExternalStore(favoriteStore.subscribe, favoriteStore.getSnapshot);

  const addFavorite = useCallback(
    (newValue: number) => {
      const currentFavorites = favoriteStore.getSnapshot();

      // if the value is already in the favorites, do nothing
      if (currentFavorites.includes(newValue)) {
        return;
      }

      const newFavorites = [...currentFavorites, newValue];
      setValue(newFavorites);
      favoriteStore.addFavorite(newValue);
    },
    [setValue],
  );

  const removeFavorite = useCallback(
    (newValue: number) => {
      const currentFavorites = favoriteStore.getSnapshot();

      // if the value is not in the favorites, do nothing
      if (!currentFavorites.includes(newValue)) {
        return;
      }

      const newFavorites = currentFavorites.filter((v) => v !== newValue);
      setValue(newFavorites);
      favoriteStore.removeFavorite(newValue);
    },
    [setValue],
  );

  const hasFavorites = useMemo(() => favorites && favorites.length > 0, [favorites]);

  const isFavorite = useCallback((value: number) => favorites?.includes(value), [favorites]);

  return {
    favorites,
    addFavorite,
    removeFavorite,
    hasFavorites,
    isFavorite,
  };
};
