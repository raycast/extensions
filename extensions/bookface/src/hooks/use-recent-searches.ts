import { useCallback, useEffect, useState } from "react";
import { LocalStorage } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

export type RecentSearch = {
  query: string;
  timestamp: number;
};

type UseRecentSearchesResult = {
  recentSearches: RecentSearch[];
  addRecentSearch: (query: string) => Promise<void>;
  removeRecentSearch: (query: string) => Promise<void>;
  clearRecentSearches: () => Promise<void>;
  isLoading: boolean;
};

function isRecentSearch(value: unknown): value is RecentSearch {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as RecentSearch).query === "string" &&
    typeof (value as RecentSearch).timestamp === "number"
  );
}

export function useRecentSearches(
  storageKey: string,
  limit = 25,
): UseRecentSearchesResult {
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stored = await LocalStorage.getItem<string>(storageKey);
        if (cancelled) return;
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            const valid = parsed.filter(isRecentSearch);
            valid.sort((a, b) => b.timestamp - a.timestamp);
            setRecentSearches(valid.slice(0, limit));
          }
        }
      } catch {
        // Corrupt storage falls back to empty state.
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [storageKey, limit]);

  const persist = useCallback(
    async (next: RecentSearch[]) => {
      await LocalStorage.setItem(storageKey, JSON.stringify(next));
      setRecentSearches(next);
    },
    [storageKey],
  );

  const addRecentSearch = useCallback(
    async (query: string) => {
      const trimmed = query.trim();
      if (!trimmed) return;
      try {
        const filtered = recentSearches.filter((s) => s.query !== trimmed);
        const next = [
          { query: trimmed, timestamp: Date.now() },
          ...filtered,
        ].slice(0, limit);
        // persist() awaits the disk write before updating state, so a rejected
        // setItem (quota, transient error) reaches the catch instead of leaving
        // an optimistic in-memory entry that vanishes on next launch.
        await persist(next);
      } catch (err) {
        await showFailureToast(err, { title: "Failed to save recent" });
      }
    },
    [recentSearches, limit, persist],
  );

  const removeRecentSearch = useCallback(
    async (query: string) => {
      try {
        await persist(recentSearches.filter((s) => s.query !== query));
      } catch (err) {
        await showFailureToast(err, { title: "Failed to remove recent" });
      }
    },
    [recentSearches, persist],
  );

  const clearRecentSearches = useCallback(async () => {
    try {
      await LocalStorage.removeItem(storageKey);
      setRecentSearches([]);
    } catch (err) {
      await showFailureToast(err, { title: "Failed to clear recents" });
    }
  }, [storageKey]);

  return {
    recentSearches,
    addRecentSearch,
    removeRecentSearch,
    clearRecentSearches,
    isLoading,
  };
}
