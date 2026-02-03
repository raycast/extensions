import { useCachedState } from "@raycast/utils";
import { MAX_HISTORY_ITEMS } from "../constants";
import type { SearchHistoryEntry } from "../types";

const HISTORY_STORAGE_KEY = "history-v1";

type UseHistoryResult = {
  history: SearchHistoryEntry[];
  addToHistory: (entry: Omit<SearchHistoryEntry, "timestamp">) => void;
  removeFromHistory: (pattern: string) => void;
  clearHistory: () => void;
  getRecentPatterns: (limit?: number) => string[];
};

/**
 * Hook to manage search history with persistence.
 * @returns Object containing history array, addToHistory, removeFromHistory, clearHistory, and getRecentPatterns functions
 */
export const useHistory = (): UseHistoryResult => {
  const [history, setHistory] = useCachedState<SearchHistoryEntry[]>(HISTORY_STORAGE_KEY, []);

  const addToHistory = (entry: Omit<SearchHistoryEntry, "timestamp">) => {
    setHistory((prev) => {
      const filtered = prev.filter(({ pattern }) => pattern !== entry.pattern);
      return [{ ...entry, timestamp: Date.now() }, ...filtered].slice(0, MAX_HISTORY_ITEMS);
    });
  };

  const removeFromHistory = (pattern: string) => {
    setHistory((prev) => prev.filter((entry) => entry.pattern !== pattern));
  };

  const clearHistory = () => {
    setHistory([]);
  };

  const getRecentPatterns = (limit = 5) => {
    return history.slice(0, limit).map(({ pattern }) => pattern);
  };

  return {
    history,
    addToHistory,
    removeFromHistory,
    clearHistory,
    getRecentPatterns,
  };
};
