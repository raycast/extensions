import { LocalStorage } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import type { SearchHistoryItem, SearchMode } from "../types";
import { searchLogger } from "../utils/logger";

const HISTORY_KEY_PREFIX = "qmd-search-history";
const MAX_HISTORY_ITEMS = 10;

function getHistoryKey(mode: SearchMode): string {
  return `${HISTORY_KEY_PREFIX}-${mode}`;
}

interface UseSearchHistoryResult {
  history: SearchHistoryItem[];
  isLoading: boolean;
  addToHistory: (query: string) => Promise<void>;
  clearHistory: () => Promise<void>;
}

export function useSearchHistory(searchMode: SearchMode): UseSearchHistoryResult {
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const historyKey = getHistoryKey(searchMode);

  // Load history on mount or when search mode changes
  useEffect(() => {
    const loadHistory = async () => {
      setIsLoading(true);
      try {
        const stored = await LocalStorage.getItem<string>(historyKey);
        if (stored) {
          const parsed = JSON.parse(stored) as SearchHistoryItem[];
          setHistory(parsed);
        } else {
          setHistory([]);
        }
      } catch (error) {
        searchLogger.error("Failed to load search history", { error });
        setHistory([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadHistory();
  }, [historyKey]);

  const addToHistory = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        return;
      }

      const newItem: SearchHistoryItem = {
        query: query.trim(),
        timestamp: Date.now(),
      };

      setHistory((prev) => {
        // Remove existing entry with same query
        const filtered = prev.filter((item) => item.query !== newItem.query);
        // Add new item at the beginning
        const newHistory = [newItem, ...filtered].slice(0, MAX_HISTORY_ITEMS);

        // Save to storage (fire and forget)
        LocalStorage.setItem(historyKey, JSON.stringify(newHistory)).catch((error) => {
          searchLogger.error("Failed to save search history", { error });
        });

        return newHistory;
      });
    },
    [historyKey],
  );

  const clearHistory = useCallback(async () => {
    setHistory([]);
    try {
      await LocalStorage.removeItem(historyKey);
    } catch (error) {
      searchLogger.error("Failed to clear search history", { error });
    }
  }, [historyKey]);

  return {
    history,
    isLoading,
    addToHistory,
    clearHistory,
  };
}
