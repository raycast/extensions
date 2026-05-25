import { LocalStorage, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";

export interface FavoritesStore {
  add: (symbol: string) => void;
  remove: (symbol: string) => void;
  moveUp: (symbol: string) => void;
  moveDown: (symbol: string) => void;
}

export function useFavorites(): {
  favorites: string[];
  favoritesStore: FavoritesStore;
  isLoading: boolean;
} {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const persist = useCallback(async (next: string[]) => {
    setFavorites(next);
    try {
      await LocalStorage.setItem("favorites", JSON.stringify(next));
    } catch (e) {
      showToast({
        style: Toast.Style.Failure,
        title: "Storage Error",
        message: e instanceof Error ? e.message : "Could not save favorites",
      });
    }
  }, []);

  useEffect(() => {
    (async () => {
      const raw = await LocalStorage.getItem<string>("favorites");
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (
            Array.isArray(parsed) &&
            parsed.every((s) => typeof s === "string")
          ) {
            setFavorites(parsed);
          }
        } catch {
          // corrupted, reset
        }
      }
      setIsLoading(false);
    })();
  }, []);

  const add = useCallback(
    (symbol: string) => {
      if (favorites.includes(symbol)) return;
      persist([...favorites, symbol]);
      showToast({
        style: Toast.Style.Success,
        title: `Added ${symbol} to favorites`,
      });
    },
    [favorites, persist],
  );

  const remove = useCallback(
    (symbol: string) => {
      if (!favorites.includes(symbol)) return;
      persist(favorites.filter((s) => s !== symbol));
      showToast({
        style: Toast.Style.Success,
        title: `Removed ${symbol} from favorites`,
      });
    },
    [favorites, persist],
  );

  const move = useCallback(
    (symbol: string, delta: -1 | 1) => {
      const i = favorites.indexOf(symbol);
      const j = i + delta;
      if (i === -1 || j < 0 || j >= favorites.length) return;
      const next = [...favorites];
      [next[i], next[j]] = [next[j], next[i]];
      persist(next);
    },
    [favorites, persist],
  );

  return {
    favorites,
    favoritesStore: {
      add,
      remove,
      moveUp: (s) => move(s, -1),
      moveDown: (s) => move(s, 1),
    },
    isLoading,
  };
}
