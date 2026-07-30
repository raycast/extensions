import { LocalStorage, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { createCatalogHistoryStore } from "../lib/catalog-history";

const FAVORITES_KEY = "favorite-command-ids";
const RECENTS_KEY = "recent-command-ids";

async function readIds(key: string): Promise<string[]> {
  const value = await LocalStorage.getItem<string>(key);
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

async function writeIds(key: string, ids: string[]) {
  await LocalStorage.setItem(key, JSON.stringify(ids));
}

export function useCatalogHistory() {
  const [store] = useState(() =>
    createCatalogHistoryStore({
      readFavorites: () => readIds(FAVORITES_KEY),
      readRecents: () => readIds(RECENTS_KEY),
      writeFavorites: (ids) => writeIds(FAVORITES_KEY, ids),
      writeRecents: (ids) => writeIds(RECENTS_KEY, ids),
    }),
  );
  const { favoriteIds, recentIds } = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);

  useEffect(() => {
    void store.hydrate().catch(() =>
      showToast({
        style: Toast.Style.Failure,
        title: "Could Not Load Favorites and Recents",
      }),
    );
  }, [store]);

  const toggleFavorite = useCallback(
    async (id: string) => {
      try {
        const added = await store.toggleFavorite(id);
        await showToast({
          style: Toast.Style.Success,
          title: added ? "Added to Favorites" : "Removed from Favorites",
        });
      } catch {
        await showToast({
          style: Toast.Style.Failure,
          title: "Could Not Update Favorites",
        });
      }
    },
    [store],
  );

  const recordRecent = useCallback(
    (id: string) => {
      void store.recordRecent(id).catch(() =>
        showToast({
          style: Toast.Style.Failure,
          title: "Could Not Update Recently Used",
        }),
      );
    },
    [store],
  );

  return { favoriteIds, recentIds, toggleFavorite, recordRecent };
}
