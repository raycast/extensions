import { LocalStorage } from "@raycast/api";
import * as fs from "node:fs";
import { type Paper, isPaperRecord } from "./paper-utils";
import { getPaperStateKey } from "./read-utils";
import { createListStore } from "./list-store";
import { useListStore } from "./use-list-store";

const FAVORITES_STORAGE_KEY = "favorite-papers";

export type FavoritePaper = Paper & { favoritedAt: string };

function sortFavorites(items: FavoritePaper[]): FavoritePaper[] {
  return [...items].sort((left, right) => right.favoritedAt.localeCompare(left.favoritedAt));
}

async function readFavorites(): Promise<FavoritePaper[]> {
  const raw = await LocalStorage.getItem<string>(FAVORITES_STORAGE_KEY);
  if (!raw) return [];
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed) || !parsed.every(isPaperRecord)) {
    throw new Error("Saved papers are invalid. Existing data has not been overwritten.");
  }
  return sortFavorites(
    parsed.map((entry) => ({
      ...entry,
      hasNote: fs.existsSync(entry.notePath),
      favoritedAt:
        typeof (entry as FavoritePaper).favoritedAt === "string"
          ? (entry as FavoritePaper).favoritedAt
          : new Date(0).toISOString(),
    })),
  );
}

const store = createListStore(readFavorites, async (items) => {
  await LocalStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(sortFavorites(items)));
});

export function useFavoritePapers() {
  const { items, isLoading, error } = useListStore(store, "Could not load favorites");
  const isFavorite = (paper: Paper) => items.some((entry) => getPaperStateKey(entry) === getPaperStateKey(paper));
  const remove = (paper: Paper) =>
    store.update((current) => current.filter((entry) => getPaperStateKey(entry) !== getPaperStateKey(paper)));
  const add = (paper: Paper) =>
    store.update((current) =>
      sortFavorites([
        ...current.filter((entry) => getPaperStateKey(entry) !== getPaperStateKey(paper)),
        { ...paper, hasNote: fs.existsSync(paper.notePath), favoritedAt: new Date().toISOString() },
      ]),
    );
  return {
    favorites: items,
    isLoading,
    error,
    isFavorite,
    addFavorite: add,
    removeFavorite: remove,
    reloadFavorites: store.reload,
  };
}
