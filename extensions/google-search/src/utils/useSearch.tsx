import { removeLocalStorageItem, setLocalStorageItem, showToast, ToastStyle } from "@raycast/api";
import { AbortError } from "node-fetch";
import { useState, useRef, useEffect } from "react";
import { getSearchResults, getSearchHistory } from "./handleResults";
import { SearchResult, HISTORY_KEY } from "./types";

export function useSearch() {
  const [isLoading, setIsLoading] = useState(true);
  const [history, setHistory] = useState<SearchResult[]>([]);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searchText, setSearchText] = useState("");
  const cancelRef = useRef<AbortController | null>(null);

  useEffect(() => {
    getHistory();

    return () => {
      cancelRef.current?.abort();
    };
  }, []);

  async function getHistory() {
    const newHistory = await getSearchHistory();
    setIsLoading(false);
    setHistory(newHistory);
  }

  async function addHistory(result: SearchResult) {
    const newHistory = [...history];

    if (newHistory.some((item) => item.query === result.query)) {
      return;
    }

    newHistory?.unshift({
      ...result,
      isHistory: true,
    });

    await setHistory(newHistory);
    await setLocalStorageItem(HISTORY_KEY, JSON.stringify(newHistory));
  }

  async function deleteAllHistory() {
    await removeLocalStorageItem(HISTORY_KEY);

    setHistory([]);
    showToast(ToastStyle.Success, "Cleared search history");
  }

  async function deleteHistoryItem(result: SearchResult) {
    const newHistory = [...history];
    const index = newHistory.findIndex((item) => item.query === result.query);

    if (index < 0) {
      return;
    }

    newHistory?.splice(index, 1);
    await setLocalStorageItem(HISTORY_KEY, JSON.stringify(newHistory));
    setHistory(newHistory);
    showToast(ToastStyle.Success, "Removed from history");
  }

  async function search(query: string) {
    cancelRef.current?.abort();
    cancelRef.current = new AbortController();

    try {
      setIsLoading(true);
      setSearchText(query);

      let results: SearchResult[] = [];

      if (query) {
        results = await getSearchResults(query, cancelRef.current.signal);
      }

      setIsLoading(false);
      setResults(results);
    } catch (error) {
      if (error instanceof AbortError) {
        return;
      }

      console.error("search error", error);
      showToast(ToastStyle.Failure, "Could not perform search", String(error));
    }
  }

  return {
    isLoading,
    results,
    searchText,
    search,
    history,
    addHistory,
    deleteAllHistory,
    deleteHistoryItem,
  };
}
