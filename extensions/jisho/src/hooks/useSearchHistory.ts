import { LocalStorage, getPreferenceValues } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useCallback, useEffect, useMemo, useRef } from "react";

import { SearchHistory, SearchHistoryItem, SearchResult } from "../types/types";

export const getCurrentHistory = async (): Promise<SearchHistory> => {
  try {
    const history = await LocalStorage.getItem<string>("history");
    if (!history) return [];

    return JSON.parse(history);
  } catch (e) {
    return [];
  }
};

const equals = (a: SearchHistoryItem, b: SearchHistoryItem) => {
  if (a.type === "query" && b.type === "query") {
    return a.query === b.query;
  }

  if (a.type === "result" && b.type === "result") {
    return a.url === b.url;
  }

  return false;
};

const appendToHistory = (history: SearchHistory, search: SearchHistoryItem): SearchHistory => {
  // Remove duplicates and push to the end
  history = history.filter((item) => !equals(item, search));
  history.splice(0, 0, search);

  return history;
};

export const SearchHistoryItems = {
  resultItem: (result: SearchResult): SearchHistoryItem => ({
    type: "result",
    ...result,
  }),
  queryItem: (query: string): SearchHistoryItem => ({
    type: "query",
    query,
  }),
};

export const useSearchHistory = (currentSearch: string) => {
  const preferences = useMemo(() => getPreferenceValues(), []);

  const currentSearchRef = useRef<string>(currentSearch);
  useEffect(() => {
    if (preferences["save-to-history-on-clear"] && currentSearchRef.current) {
      setHistory((history) => appendToHistory(history, SearchHistoryItems.queryItem(currentSearchRef.current)));
    }

    currentSearchRef.current = currentSearch;
  }, [currentSearch]);

  const [history, setHistory] = useCachedState("history", [] as SearchHistory);

  const addToHistory = useCallback((chosenItem: SearchHistoryItem) => {
    setHistory((history) => appendToHistory(history, chosenItem));
  }, []);

  const removeFromHistory = useCallback((chosenItem: SearchHistoryItem) => {
    setHistory((history) => history.filter((item) => !equals(item, chosenItem)));
  }, []);

  return { addToHistory, removeFromHistory, history };
};
