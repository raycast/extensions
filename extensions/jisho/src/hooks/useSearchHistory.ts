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

export const useSearchHistory = (currentSearch: string) => {
  const preferences = useMemo(() => getPreferenceValues(), []);

  const currentSearchRef = useRef<string>(currentSearch);
  useEffect(() => {
    if (preferences["save-to-history-on-clear"] && currentSearchRef.current) {
      setHistory((history) =>
        appendToHistory(history, {
          type: "query",
          query: currentSearchRef.current,
        })
      );
    }

    currentSearchRef.current = currentSearch;
  }, [currentSearch]);

  const [history, setHistory] = useCachedState("history", [] as SearchHistory);

  const onChoose = useCallback((chosenItem: SearchResult) => {
    setHistory((history) =>
      appendToHistory(history, {
        type: "result",
        ...chosenItem,
      })
    );
  }, []);

  return { onChoose, history };
};
