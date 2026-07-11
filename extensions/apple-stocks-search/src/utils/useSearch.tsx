//useSearch.tsx
import { getPreferenceValues, LocalStorage } from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
import { getStaticResult } from "./handleResults";
import { SearchResult, HISTORY_KEY, Preferences } from "./types";

export function useSearch() {
  const { rememberSearchHistory } = getPreferenceValues<Preferences>();
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<SearchResult[]>([]);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searchText, setSearchText] = useState("");

  const loadHistory = useCallback(async () => {
    try {
      const storedHistory = await LocalStorage.getItem<string>(HISTORY_KEY);
      if (storedHistory) {
        const parsedHistory = JSON.parse(storedHistory);
        setHistory(parsedHistory);
      } else {
        console.log("No history found.");
      }
    } catch (error) {
      console.error("Failed to load history:", error);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const saveHistory = useCallback(
    async (newHistory: SearchResult[]) => {
      try {
        if (rememberSearchHistory) {
          await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
        }
      } catch (error) {
        console.error("Failed to save history:", error);
      }
    },
    [rememberSearchHistory],
  );

  const addHistory = useCallback(
    async (result: SearchResult) => {
      const newHistory = [result, ...history.filter((item) => item.query !== result.query)].slice(0, 20); // Keep only the last 20 items
      setHistory(newHistory);
      await saveHistory(newHistory);
    },
    [history, saveHistory],
  );

  const search = useCallback((query: string) => {
    setSearchText(query);
    setIsLoading(true);
    const staticResults = getStaticResult(query);
    setResults(staticResults);
    setIsLoading(false);
  }, []);

  return {
    isLoading,
    results,
    searchText,
    search,
    history,
    addHistory,
  };
}
