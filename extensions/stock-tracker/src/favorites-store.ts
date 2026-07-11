import { LocalStorage, showToast } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";

export interface FavoritesStore {
  add: (symbol: string) => void;
  remove: (symbol: string) => void;
  moveUp: (symbol: string) => void;
  moveDown: (symbol: string) => void;
}

export function useFavorites(): { favorites: string[]; favoritesStore: FavoritesStore; isLoading: boolean } {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const updateFavorites = useCallback(
    (newFavorites: string[]) => {
      setFavorites(newFavorites);
      LocalStorage.setItem("favorites", JSON.stringify(newFavorites));
    },
    [setFavorites],
  );

  // Load from local storage on mount
  useEffect(() => {
    const update = async () => {
      const favs = await load();
      setFavorites(favs);
      setIsLoading(false);
    };
    update();
  }, []);

  const add = useCallback(
    (symbol: string) => {
      if (favorites.includes(symbol)) {
        return;
      }
      updateFavorites([...favorites, symbol]);
      showToast({ title: `Added ${symbol} to favorites` });
    },
    [favorites, updateFavorites],
  );

  const remove = useCallback(
    (symbol: string) => {
      if (!favorites.includes(symbol)) {
        return;
      }
      updateFavorites(favorites.filter((s) => s !== symbol));
      showToast({ title: `Removed ${symbol} from favorites` });
    },
    [favorites, updateFavorites],
  );

  const move = useCallback(
    (symbol: string, delta: -1 | 1) => {
      const i = favorites.indexOf(symbol);
      const j = i + delta;
      if (i === -1 || j < 0 || j >= favorites.length) {
        return;
      }
      const next = [...favorites];
      [next[i], next[j]] = [next[j], next[i]];
      updateFavorites(next);
    },
    [favorites, updateFavorites],
  );

  return {
    favorites,
    favoritesStore: {
      add,
      remove,
      moveUp: (symbol) => move(symbol, -1),
      moveDown: (symbol) => move(symbol, 1),
    },
    isLoading,
  };
}

async function load(): Promise<string[]> {
  const favorites = await LocalStorage.getItem<string>("favorites");
  if (!favorites) {
    return [];
  }
  try {
    const parsed = JSON.parse(favorites);
    if (Array.isArray(parsed) && parsed.every((s) => typeof s === "string")) {
      return parsed;
    }
    console.warn("favorites: stored value is not a string array, resetting");
  } catch (e) {
    console.warn("favorites: failed to parse stored value, resetting", e);
  }
  return [];
}
