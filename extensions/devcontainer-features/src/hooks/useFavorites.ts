import { LocalStorage } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";

const FAVORITES_KEY = "devcontainer-favorites";

interface UseFavoritesResult {
  favorites: string[];
  isFavorite: (reference: string) => boolean;
  addFavorite: (reference: string) => Promise<void>;
  removeFavorite: (reference: string) => Promise<void>;
  toggleFavorite: (reference: string) => Promise<void>;
  isLoading: boolean;
}

export function useFavorites(): UseFavoritesResult {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load favorites from storage
  useEffect(() => {
    async function loadFavorites() {
      try {
        const raw = await LocalStorage.getItem<string>(FAVORITES_KEY);
        if (raw) {
          setFavorites(JSON.parse(raw));
        }
      } catch (err) {
        console.error("Failed to load favorites:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadFavorites();
  }, []);

  const saveFavorites = useCallback(async (newFavorites: string[]) => {
    setFavorites(newFavorites);
    await LocalStorage.setItem(FAVORITES_KEY, JSON.stringify(newFavorites));
  }, []);

  const isFavorite = useCallback(
    (reference: string) => {
      return favorites.includes(reference);
    },
    [favorites],
  );

  const addFavorite = useCallback(
    async (reference: string) => {
      if (!favorites.includes(reference)) {
        await saveFavorites([...favorites, reference]);
      }
    },
    [favorites, saveFavorites],
  );

  const removeFavorite = useCallback(
    async (reference: string) => {
      await saveFavorites(favorites.filter((f) => f !== reference));
    },
    [favorites, saveFavorites],
  );

  const toggleFavorite = useCallback(
    async (reference: string) => {
      if (isFavorite(reference)) {
        await removeFavorite(reference);
      } else {
        await addFavorite(reference);
      }
    },
    [isFavorite, addFavorite, removeFavorite],
  );

  return {
    favorites,
    isFavorite,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    isLoading,
  };
}
