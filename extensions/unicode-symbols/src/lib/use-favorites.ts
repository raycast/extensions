import { useCallback } from "react";

import { useStateAndLocalStorage } from "./use-state-and-localstorage";

interface UseFavoritesParams<T> {
  key: string;
  comparator: keyof T | ((existingItem: T, itemToAdd: T) => boolean);
  limit?: number;
}

export function useFavorites<T>(params: UseFavoritesParams<T>) {
  const { key, comparator, limit = 50 } = params;

  const [favorites, setFavorites, areFavoritesLoaded] = useStateAndLocalStorage<T[]>(key, []);

  const addToFavorites = useCallback(
    (itemToAdd: T) => {
      setFavorites((currFavorites) => {
        const isItemToAddAlreadyInFavorites = currFavorites.some((existingItem) =>
          typeof comparator === "function"
            ? comparator(existingItem, itemToAdd)
            : existingItem[comparator] === itemToAdd[comparator],
        );
        return isItemToAddAlreadyInFavorites ? currFavorites : [itemToAdd, ...currFavorites].slice(0, limit);
      });
    },
    [comparator, limit],
  );

  const removeFromFavorites = useCallback(
    (itemToRemove: T) => {
      setFavorites((currFavorites) => {
        const isItemToRemoveInFavorites = currFavorites.find((existingItem) =>
          typeof comparator === "function"
            ? comparator(existingItem, itemToRemove)
            : existingItem[comparator] === itemToRemove[comparator],
        );
        return isItemToRemoveInFavorites
          ? currFavorites.filter((existingItem) =>
              typeof comparator === "function"
                ? !comparator(existingItem, itemToRemove)
                : existingItem[comparator] !== itemToRemove[comparator],
            )
          : currFavorites;
      });
    },
    [comparator],
  );

  const clearFavorites = useCallback(() => {
    setFavorites([]);
  }, []);

  const isFavorite = useCallback(
    (item: T) => {
      return favorites.some((favorite) =>
        typeof comparator === "function" ? comparator(favorite, item) : favorite[comparator] === item[comparator],
      );
    },
    [favorites, comparator],
  );

  return {
    favorites,
    addToFavorites,
    removeFromFavorites,
    clearFavorites,
    isFavorite,
    areFavoritesLoaded,
  };
}
