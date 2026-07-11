import { useState, useEffect, useCallback } from "react";
import { LocalStorage } from "@raycast/api";
import { HistoryItem, SearchMode } from "../types";
import { SearchResult } from "../utils";

export function useSearchHistory() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load history on mount
  useEffect(() => {
    (async () => {
      const storedHistory =
        await LocalStorage.getItem<string>("search-history");
      if (storedHistory) {
        try {
          const parsed = JSON.parse(storedHistory);
          setHistory(parsed);
        } catch (e) {
          console.error("Failed to parse history", e);
        }
      }
      setIsLoading(false);
    })();
  }, []);

  // Add result to history
  const addToHistory = useCallback(
    async (ip: string, results: SearchResult[], mode: SearchMode) => {
      setHistory((prev) => {
        // Remove existing entry for this IP if any
        const filtered = prev.filter((h) => h.ip !== ip);
        const newItem: HistoryItem = {
          ip,
          results,
          timestamp: Date.now(),
          projectCount: new Set(results.map((r) => r.projectId)).size,
          mode,
        };
        const newHistory = [newItem, ...filtered].slice(0, 50); // Keep last 50
        LocalStorage.setItem("search-history", JSON.stringify(newHistory));
        return newHistory;
      });
    },
    [],
  );

  // Remove from history
  const removeFromHistory = useCallback(async (ip: string) => {
    setHistory((prev) => {
      const newHistory = prev.filter((h) => h.ip !== ip);
      LocalStorage.setItem("search-history", JSON.stringify(newHistory));
      return newHistory;
    });
  }, []);

  return {
    history,
    isLoading,
    addToHistory,
    removeFromHistory,
  };
}
