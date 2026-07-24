import { useCallback, useEffect, useState } from "react";
import { LocalStorage, showToast, Toast } from "@raycast/api";
import { failureToast } from "./toast";

export interface RecentSearch {
  query: string;
  timestamp: number;
}

const DEFAULT_LIMIT = 20;

/**
 * Persists recent search queries, newest first.
 *
 * Reddit's feed allows only about one request per minute, so re-running a past
 * search is expensive enough to be worth one keystroke rather than retyping.
 *
 * Each command passes its own `storageKey` so post and subreddit histories stay
 * separate — mixing them would offer a subreddit query as a post search.
 */
export default function useRecentSearches(storageKey: string, limit = DEFAULT_LIMIT) {
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const stored = await LocalStorage.getItem<string>(storageKey);
        if (stored) {
          setRecentSearches(JSON.parse(stored) as RecentSearch[]);
        }
      } catch {
        // A corrupt history is not worth interrupting a search over — start clean.
        setRecentSearches([]);
      }
    };

    load();
  }, [storageKey]);

  const persist = useCallback(
    async (searches: RecentSearch[]) => {
      setRecentSearches(searches);
      await LocalStorage.setItem(storageKey, JSON.stringify(searches));
    },
    [storageKey],
  );

  const addRecentSearch = useCallback(
    async (query: string) => {
      const trimmed = query.trim();
      if (!trimmed) {
        return;
      }

      try {
        // Read from storage rather than state so a save can't clobber an entry
        // added by another mounted view.
        const stored = await LocalStorage.getItem<string>(storageKey);
        const current: RecentSearch[] = stored ? JSON.parse(stored) : [];
        const deduped = current.filter((search) => search.query.toLowerCase() !== trimmed.toLowerCase());
        await persist([{ query: trimmed, timestamp: Date.now() }, ...deduped].slice(0, limit));
      } catch (error) {
        await failureToast("Couldn’t save recent search", error);
      }
    },
    [storageKey, persist, limit],
  );

  const removeRecentSearch = useCallback(
    async (query: string) => {
      try {
        await persist(recentSearches.filter((search) => search.query !== query));
      } catch (error) {
        await failureToast("Couldn’t remove recent search", error);
      }
    },
    [recentSearches, persist],
  );

  const clearRecentSearches = useCallback(async () => {
    try {
      setRecentSearches([]);
      await LocalStorage.removeItem(storageKey);
      await showToast({ style: Toast.Style.Success, title: "Cleared recent searches" });
    } catch (error) {
      await failureToast("Couldn’t clear recent searches", error);
    }
  }, [storageKey]);

  return { recentSearches, addRecentSearch, removeRecentSearch, clearRecentSearches };
}
