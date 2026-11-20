import { LocalStorage } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";

export interface RecentSearch {
  query: string;
  timestamp: number;
}

const LIMIT = 20;

export function useRecentSearches(key: string) {
  const storageKey = `recent-searches:${key}`;
  const { value, setValue, isLoading } = useLocalStorage<RecentSearch[]>(storageKey, []);
  const recents = value ?? [];

  return {
    recents,
    isLoading,
    // A search can finish long after it started, so merge into what is stored now, not what was on screen then.
    add: async (query: string) => {
      const stored = await LocalStorage.getItem<string>(storageKey);
      const latest: RecentSearch[] = stored ? JSON.parse(stored) : [];
      await setValue([{ query, timestamp: Date.now() }, ...latest.filter((r) => r.query !== query)].slice(0, LIMIT));
    },
    remove: (query: string) => setValue(recents.filter((r) => r.query !== query)),
    clear: () => setValue([]),
  };
}
