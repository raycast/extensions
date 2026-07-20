import { showToast, Toast } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useCallback } from "react";
import { randomUUID } from "crypto";
import { RecentSearch } from "../api/types";

const HISTORY_KEY = "shodan_query_history";
const MAX_HISTORY_SIZE = 50;

export function useQueryHistory() {
  const [history, setHistory] = useCachedState<RecentSearch[]>(HISTORY_KEY, []);

  const addToHistory = useCallback(
    async (query: string, resultCount: number): Promise<void> => {
      // Don't add empty queries
      if (!query || query.trim().length === 0) return;

      const trimmedQuery = query.trim();

      // Remove existing entry for same query (to move it to top)
      const filtered = history.filter((h) => h.query !== trimmedQuery);

      const newEntry: RecentSearch = {
        id: randomUUID(),
        query: trimmedQuery,
        timestamp: new Date().toISOString(),
        resultCount,
      };

      // Add to beginning, limit to MAX_HISTORY_SIZE
      const updated = [newEntry, ...filtered].slice(0, MAX_HISTORY_SIZE);
      setHistory(updated);
    },
    [history, setHistory],
  );

  const removeFromHistory = useCallback(
    async (id: string): Promise<void> => {
      const updated = history.filter((h) => h.id !== id);
      setHistory(updated);

      await showToast({
        style: Toast.Style.Success,
        title: "Removed from History",
      });
    },
    [history, setHistory],
  );

  const clearHistory = useCallback(async (): Promise<void> => {
    setHistory([]);

    await showToast({
      style: Toast.Style.Success,
      title: "History Cleared",
      message: "All search history has been removed.",
    });
  }, [setHistory]);

  const getHistoryEntry = useCallback(
    (id: string): RecentSearch | undefined => {
      return history.find((h) => h.id === id);
    },
    [history],
  );

  return {
    history,
    addToHistory,
    removeFromHistory,
    clearHistory,
    getHistoryEntry,
    isLoading: false,
  };
}
