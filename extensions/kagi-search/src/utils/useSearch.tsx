// src/utils/useSearch.tsx
import { removeLocalStorageItem, setLocalStorageItem, showToast, Toast } from "@raycast/api";
import { AbortError } from "node-fetch";
import { useState, useRef, useEffect } from "react";
import { getSearchResults, getSearchHistory } from "./handleResults";
import { searchWithKagiAPI, searchWithFastGPT } from "./kagiApi";
import { SearchResult, HISTORY_KEY } from "./types";

export function useSearch(token: string, apiKey: string) {
  const [isLoading, setIsLoading] = useState(true);
  const [history, setHistory] = useState<SearchResult[]>([]);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searchText, setSearchText] = useState("");
  const [fastGPTResult, setFastGPTResult] = useState<SearchResult | null>(null);
  const [isFastGPTLoading, setIsFastGPTLoading] = useState(false);
  const cancelRef = useRef<AbortController | null>(null);
  const fastGPTCancelRef = useRef<AbortController | null>(null);

  useEffect(() => {
    getHistory();

    return () => {
      cancelRef.current?.abort();
      fastGPTCancelRef.current?.abort();
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
    showToast(Toast.Style.Success, "Cleared search history");
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
    showToast(Toast.Style.Success, "Removed from history");
  }

  // In src/utils/useSearch.tsx
  async function search(query: string) {
    cancelRef.current?.abort();
    cancelRef.current = new AbortController();

    try {
      setIsLoading(true);
      setSearchText(query);
      setFastGPTResult(null);

      let results: SearchResult[] = [];

      if (query) {
        results = await getSearchResults(query, token, cancelRef.current.signal);
      }

      setIsLoading(false);
      setResults(results);
    } catch (error) {
      if (error instanceof AbortError) {
        return;
      }

      console.error("search error", error);
      showToast(Toast.Style.Failure, "Could not perform search", String(error));
    }
  }

  async function queryFastGPT(query: string) {
    fastGPTCancelRef.current?.abort();
    fastGPTCancelRef.current = new AbortController();

    console.log("queryFastGPT", query);
    try {
      setIsFastGPTLoading(true);

      const result = await searchWithFastGPT(query, apiKey, fastGPTCancelRef.current.signal);
      if (result) {
        setFastGPTResult(result);
      } else {
        setFastGPTResult(null);
        showToast(Toast.Style.Failure, "No FastGPT results found");
      }

      setIsFastGPTLoading(false);
    } catch (error) {
      if (error instanceof AbortError) {
        return;
      }

      console.error("FastGPT error", error);
      showToast(Toast.Style.Failure, "Could not query FastGPT", String(error));
      setIsFastGPTLoading(false);
    }
  }

  async function searchWithApi(query: string) {
    cancelRef.current?.abort();
    cancelRef.current = new AbortController();

    try {
      setIsLoading(true);
      setSearchText(query);
      setFastGPTResult(null);

      let results: SearchResult[] = [];

      if (query) {
        results = await searchWithKagiAPI(query, apiKey, cancelRef.current.signal);

        // If the query ends with a question mark, query FastGPT
        if (query.trim().endsWith("?")) {
          queryFastGPT(query);
        }
      }

      setIsLoading(false);
      setResults(results);
      return results;
    } catch (error) {
      if (error instanceof AbortError) {
        return [];
      }

      console.error("API search error", error);
      showToast(Toast.Style.Failure, "Could not perform API search", String(error));
      return [];
    }
  }

  return {
    isLoading,
    results,
    searchText,
    search,
    searchWithApi,
    history,
    addHistory,
    deleteAllHistory,
    deleteHistoryItem,
    fastGPTResult,
    isFastGPTLoading,
    queryFastGPT,
  };
}
