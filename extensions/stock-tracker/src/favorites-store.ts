import { LocalStorage, showToast } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { useStockInfo } from "./use-stock-info";
import { Quote } from "./yahoo-finance";

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
    [setFavorites]
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
    [favorites, updateFavorites]
  );

  const remove = useCallback(
    (symbol: string) => {
      if (!favorites.includes(symbol)) {
        return;
      }
      updateFavorites(favorites.filter((s) => s !== symbol));
      showToast({ title: `Removed ${symbol} from favorites` });
    },
    [favorites, updateFavorites]
  );

  const moveUp = useCallback(
    (symbol: string) => {
      const index = favorites.indexOf(symbol);
      if (index === 0) {
        return;
      }

      const newFavs = [...favorites];
      newFavs[index] = newFavs[index - 1];
      newFavs[index - 1] = symbol;
      updateFavorites(newFavs);
    },
    [favorites, updateFavorites]
  );

  const moveDown = useCallback(
    (symbol: string) => {
      const index = favorites.indexOf(symbol);
      if (index === favorites.length - 1) {
        return favorites;
      }

      const newFavs = [...favorites];
      newFavs[index] = newFavs[index + 1];
      newFavs[index + 1] = symbol;
      updateFavorites(newFavs);
    },
    [favorites, updateFavorites]
  );

  return {
    favorites,
    favoritesStore: { add, remove, moveUp, moveDown },
    isLoading,
  };
}

export function useFavoritesQuotes(): { favorites: Quote[]; favoritesStore: FavoritesStore; isLoading: boolean } {
  const { favorites, favoritesStore, isLoading: favoritesIsLoading } = useFavorites();
  const { quotes, isLoading: quotesIsLoading } = useStockInfo(favorites);
  const isLoading = favoritesIsLoading || quotesIsLoading;

  return { favorites: favorites.map((s) => quotes[s]).filter((q): q is Quote => !!q), favoritesStore, isLoading };
}

async function load() {
  const favorites = await LocalStorage.getItem<string>("favorites");
  if (favorites) {
    return JSON.parse(favorites);
  } else {
    return [];
  }
}
