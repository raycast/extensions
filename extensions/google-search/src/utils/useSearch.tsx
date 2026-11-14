import { getPreferenceValues, LocalStorage, showToast, Toast } from "@raycast/api";
import { useState, useRef, useEffect, useMemo } from "react";
import { getAutoSearchResults, getSearchHistory, getStaticResult } from "./handleResults";
import { showErrorToast } from "./showErrorToast";
import { SearchResult, HISTORY_KEY } from "./types";

export function useSearch(initialQuery = "") {
  const { rememberSearchHistory } = getPreferenceValues<Preferences>();
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [isSuggestLoading, setIsSuggestLoading] = useState(false);
  const [history, setHistory] = useState<SearchResult[]>([]);
  const [autoResults, setAutoResults] = useState<SearchResult[]>([]);
  const [searchText, setSearchText] = useState(initialQuery);
  const cancelRef = useRef<AbortController | null>(null);
  // Updated synchronously on input, so a response that resolves before the effect
  // for the newer query has run can still tell it is stale.
  const latestQueryRef = useRef(initialQuery);

  useEffect(() => {
    getHistory();

    return () => {
      cancelRef.current?.abort();
    };
  }, []);

  // Autosuggestions
  useEffect(() => {
    const fetchQuery = async () => {
      cancelRef.current?.abort();
      const controller = new AbortController();
      cancelRef.current = controller;

      if (!searchText) {
        setAutoResults([]);
        setIsSuggestLoading(false);
        return;
      }

      try {
        setIsSuggestLoading(true);
        const autoSearchResult = await getAutoSearchResults(searchText, controller.signal);
        if (controller.signal.aborted || latestQueryRef.current !== searchText) return;
        setAutoResults(autoSearchResult);
        setIsSuggestLoading(false);
      } catch (error) {
        // A newer keystroke superseded this request. Depending on when the abort lands,
        // fetch rejects with an AbortError or a body-stream error, so check the signal.
        if (controller.signal.aborted || latestQueryRef.current !== searchText) return;

        setAutoResults([]);
        setIsSuggestLoading(false);
        console.error("Search error", error);
        await showErrorToast("Could not load suggestions", error);
      }
    };

    fetchQuery();
  }, [searchText]);

  const staticResults = useMemo(() => getStaticResult(searchText), [searchText]);

  // One row per URL: the current search, then matching history, then suggestions. A history
  // entry takes over the row of the matching search so it keeps its Remove from History action.
  const results = useMemo(() => {
    const lowerSearchText = searchText.toLowerCase();
    const historyResults = history.filter((item) => item.query?.toLowerCase().includes(lowerSearchText));
    const byUrl = new Map<string, SearchResult>();
    for (const result of [...staticResults, ...historyResults, ...autoResults]) {
      const existing = byUrl.get(result.url);
      if (!existing || (result.isHistory && !existing.isHistory)) {
        byUrl.set(result.url, result);
      }
    }
    return [...byUrl.values()];
  }, [searchText, staticResults, history, autoResults]);

  async function getHistory() {
    try {
      setHistory(await getSearchHistory());
    } catch (error) {
      console.error("Could not read search history", error);
    } finally {
      setIsHistoryLoading(false);
    }
  }

  // Start from what is stored, not from state: "Search Selected Text" may have written
  // to history while this command stayed mounted in the background.
  async function getLatestHistory() {
    return rememberSearchHistory ? await getSearchHistory() : history;
  }

  async function addHistory(result: SearchResult) {
    const latest = await getLatestHistory();
    const newHistory = [{ ...result, isHistory: true }, ...latest.filter((item) => item.url !== result.url)];

    setHistory(newHistory);

    if (rememberSearchHistory) {
      await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
    }
  }

  async function deleteAllHistory() {
    await LocalStorage.removeItem(HISTORY_KEY);

    setHistory([]);
    showToast(Toast.Style.Success, "Cleared search history");
  }

  async function deleteHistoryItem(result: SearchResult) {
    const newHistory = (await getLatestHistory()).filter((item) => item.url !== result.url);

    if (rememberSearchHistory) {
      await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
    }

    setHistory(newHistory);
    showToast(Toast.Style.Success, "Removed from history");
  }

  async function search(query: string) {
    latestQueryRef.current = query;
    setSearchText(query);
  }

  return {
    isLoading: isHistoryLoading || isSuggestLoading,
    results,
    searchText,
    search,
    history,
    addHistory,
    deleteAllHistory,
    deleteHistoryItem,
  };
}
