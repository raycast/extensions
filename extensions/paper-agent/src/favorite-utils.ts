import { LocalStorage } from "@raycast/api";
import * as fs from "node:fs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type Paper } from "./paper-utils";
import { getPaperStateKey } from "./read-utils";

const FAVORITES_STORAGE_KEY = "favorite-papers";

export type FavoritePaper = Paper & {
  favoritedAt: string;
};

function normalizePaper(paper: Paper): Paper {
  return {
    ...paper,
    hasNote: fs.existsSync(paper.notePath),
  };
}

function sortFavorites(favorites: FavoritePaper[]): FavoritePaper[] {
  return [...favorites].sort((left, right) => right.favoritedAt.localeCompare(left.favoritedAt));
}

async function readFavorites(): Promise<FavoritePaper[]> {
  const raw = await LocalStorage.getItem<string>(FAVORITES_STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    const favorites = parsed
      .filter((entry): entry is FavoritePaper => !!entry && typeof entry === "object")
      .map((entry) => ({
        ...normalizePaper(entry),
        favoritedAt: typeof entry.favoritedAt === "string" ? entry.favoritedAt : new Date(0).toISOString(),
      }));

    return sortFavorites(favorites);
  } catch {
    return [];
  }
}

async function writeFavorites(favorites: FavoritePaper[]): Promise<void> {
  await LocalStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(sortFavorites(favorites)));
}

export function useFavoritePapers() {
  const [favorites, setFavorites] = useState<FavoritePaper[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const favoritesRef = useRef<FavoritePaper[]>([]);
  const favoritesWriteRef = useRef<Promise<void>>(Promise.resolve());

  const reloadFavorites = useCallback(async () => {
    setIsLoading(true);
    const next = await readFavorites();
    favoritesRef.current = next;
    setFavorites(next);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void reloadFavorites();
  }, [reloadFavorites]);

  const favoriteKeys = useMemo(() => new Set(favorites.map((paper) => getPaperStateKey(paper))), [favorites]);

  const isFavorite = useCallback((paper: Paper) => favoriteKeys.has(getPaperStateKey(paper)), [favoriteKeys]);

  const updateFavorites = useCallback(async (updater: (current: FavoritePaper[]) => FavoritePaper[]) => {
    const nextWrite = favoritesWriteRef.current.then(async () => {
      const next = updater(favoritesRef.current);
      favoritesRef.current = next;
      setFavorites(next);
      await writeFavorites(next);
    });
    favoritesWriteRef.current = nextWrite.catch(() => undefined);
    await nextWrite;
  }, []);

  const removeFavorite = useCallback(
    async (paper: Paper) => {
      await updateFavorites((current) =>
        current.filter((entry) => getPaperStateKey(entry) !== getPaperStateKey(paper)),
      );
    },
    [updateFavorites],
  );

  const addFavorite = useCallback(
    async (paper: Paper) => {
      await updateFavorites((current) =>
        sortFavorites([
          ...current.filter((entry) => getPaperStateKey(entry) !== getPaperStateKey(paper)),
          {
            ...normalizePaper(paper),
            favoritedAt: new Date().toISOString(),
          },
        ]),
      );
    },
    [updateFavorites],
  );

  return {
    favorites,
    isLoading,
    isFavorite,
    addFavorite,
    removeFavorite,
    reloadFavorites,
  };
}
