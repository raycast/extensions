import { LocalStorage, showToast } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { Ticker } from "./schema";

export interface FavoritesStore {
  add: (ticker: Ticker) => void;
  remove: (id: string, name: string) => void;
}

async function load() {
  const favorites = await LocalStorage.getItem<string>("favorites");
  if (favorites) {
    return JSON.parse(favorites);
  } else {
    return [];
  }
}

export function useFavorites(): { favorites: Ticker[]; favoritesStore: FavoritesStore; isLoading: boolean } {
  const [favorites, setFavorites] = useState<Ticker[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const updateFavorites = useCallback(
    (newFavorites: Ticker[]) => {
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
    (ticker: Ticker) => {
      if (favorites.find((item) => item.id === ticker.id)) {
        return;
      }
      updateFavorites([...favorites, ticker]);
      showToast({ title: `Added ${ticker.name} to favorites` });
    },
    [favorites, updateFavorites]
  );

  const remove = useCallback(
    (id: string, name: string) => {
      if (!favorites.find((item) => item.id === id)) {
        return;
      }
      updateFavorites(favorites.filter((item) => item.id !== id));
      showToast({ title: `Removed ${name} from favorites` });
    },
    [favorites, updateFavorites]
  );

  return {
    favorites,
    favoritesStore: { add, remove },
    isLoading,
  };
}
