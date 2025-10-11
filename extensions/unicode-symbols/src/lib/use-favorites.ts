import type { Dispatch, SetStateAction } from "react";
import { useCallback, useEffect, useState } from "react";

import { LocalStorage } from "@raycast/api";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const useStateAndLocalStorage = <T, _ = void>(
  key: string,
  initialValue: T,
): [T, Dispatch<SetStateAction<T>>, boolean] => {
  const [state, setState] = useState<T>(initialValue);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // FIXME In the future version, we don't need didUnmount checking
    // https://github.com/facebook/react/pull/22114
    let didUnmount = false;

    (async () => {
      const cache = await LocalStorage.getItem(key);

      if (typeof cache === "string") {
        if (!didUnmount) {
          setState(JSON.parse(cache));
          setReady(true);
        }
      } else {
        if (!didUnmount) {
          setReady(true);
        }
      }
    })();

    return () => {
      didUnmount = true;
    };
  }, []);

  // @ts-expect-error TS struggles to infer the types as T could potentially be a function
  const setStateAndLocalStorage = useCallback((updater) => {
    setState((state) => {
      const newValue = typeof updater === "function" ? updater(state) : updater;
      LocalStorage.setItem(key, JSON.stringify(newValue));
      return newValue;
    });
  }, []);

  return [state, setStateAndLocalStorage, ready];
};

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
