import { LocalStorage, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { fetchQuotes, Quote } from "./google-finance";

interface FavoriteEntry {
  symbol: string;
  exchange?: string;
}

const STORAGE_KEY = "favorites";

async function loadFavorites(): Promise<FavoriteEntry[]> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function saveFavorites(favorites: FavoriteEntry[]): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoriteEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadFavorites().then((f) => {
      setFavorites(f);
      setIsLoading(false);
    });
  }, []);

  const addFavorite = useCallback(
    async (symbol: string, exchange?: string) => {
      const updated = [...favorites, { symbol, exchange }];
      setFavorites(updated);
      await saveFavorites(updated);
    },
    [favorites],
  );

  const removeFavorite = useCallback(
    async (symbol: string) => {
      const updated = favorites.filter((f) => f.symbol !== symbol);
      setFavorites(updated);
      await saveFavorites(updated);
    },
    [favorites],
  );

  const moveUp = useCallback(
    async (symbol: string) => {
      const idx = favorites.findIndex((f) => f.symbol === symbol);
      if (idx <= 0) return;
      const updated = [...favorites];
      [updated[idx - 1], updated[idx]] = [updated[idx]!, updated[idx - 1]!];
      setFavorites(updated);
      await saveFavorites(updated);
    },
    [favorites],
  );

  const moveDown = useCallback(
    async (symbol: string) => {
      const idx = favorites.findIndex((f) => f.symbol === symbol);
      if (idx < 0 || idx >= favorites.length - 1) return;
      const updated = [...favorites];
      [updated[idx], updated[idx + 1]] = [updated[idx + 1]!, updated[idx]!];
      setFavorites(updated);
      await saveFavorites(updated);
    },
    [favorites],
  );

  const isFavorite = useCallback((symbol: string) => favorites.some((f) => f.symbol === symbol), [favorites]);

  return {
    favorites,
    isLoading,
    addFavorite,
    removeFavorite,
    moveUp,
    moveDown,
    isFavorite,
  };
}

export function useFavoritesQuotes(favorites: FavoriteEntry[]) {
  const [quotes, setQuotes] = useState<Map<string, Quote>>(new Map());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (favorites.length === 0) {
      setQuotes(new Map());
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);

    fetchQuotes(
      favorites.map((f) => ({ symbol: f.symbol, exchange: f.exchange })),
      controller.signal,
    )
      .then((result) => {
        setQuotes(result);
        setIsLoading(false);
      })
      .catch((e) => {
        if (e.name !== "AbortError") {
          showToast(Toast.Style.Failure, "Failed to fetch favorites", e.message || "");
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, [favorites.map((f) => f.symbol).join(",")]);

  return { quotes, isLoading };
}
