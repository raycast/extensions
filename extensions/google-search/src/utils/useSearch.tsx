import { getPreferenceValues, LocalStorage, showToast, Toast } from "@raycast/api";
import { AbortError } from "node-fetch";
import { useState, useRef, useEffect } from "react";
import { getAutoSearchResults, getSearchHistory, getStaticResult } from "./handleResults";
import { SearchResult, HISTORY_KEY } from "./types";

export function useSearch() {
  const { rememberSearchHistory } = getPreferenceValues<Preferences>();

  const [isLoading, setIsLoading] = useState(true);
  const [history, setHistory] = useState<SearchResult[]>([]);
  const [staticResults, setStaticResults] = useState<SearchResult[]>([]);
  const [historyResults, setHistoryResults] = useState<SearchResult[]>([]);
  const [autoResults, setAutoResults] = useState<SearchResult[]>([]);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searchText, setSearchText] = useState("");
  const cancelRef = useRef<AbortController | null>(null);
  const [pauseSuggestions, setPauseSuggestions] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | undefined>(undefined);


  useEffect(() => {
    getHistory();

    return () => {
      cancelRef.current?.abort();
    };
  }, []);

  // Static result and filter history
  useEffect(() => {
    setStaticResults(getStaticResult(searchText));
  }, [searchText, pauseSuggestions]);

  // Static result and filter history
  useEffect(() => {
    const lowerSearchText = searchText.toLowerCase();
    setHistoryResults(history.filter((item) => item.query.toLowerCase().includes(lowerSearchText)));
  }, [searchText, history, pauseSuggestions]);

  // Autosuggestions
  useEffect(() => {
    const fetchQuery = async () => {
      cancelRef.current?.abort();
      cancelRef.current = new AbortController();

      try {
        setIsLoading(true);

        if (searchText) {
          const autoSearchResult = await getAutoSearchResults(searchText, cancelRef.current.signal);
          setAutoResults(autoSearchResult);
        } else {
          setAutoResults([]);
        }

        setIsLoading(false);
      } catch (error) {
        if (error instanceof AbortError) {
          return;
        }

        console.error("Search error", error);
        showToast(Toast.Style.Failure, "Could not perform search", String(error));
      }
    };

    fetchQuery();
  }, [searchText, pauseSuggestions]);

  // Combine all results
  useEffect(() => {
    if (pauseSuggestions) return;

    // combine and deduplicate results
    const combinedResults = [...staticResults, ...historyResults, ...autoResults].filter(
      (value, index, self) => index === self.findIndex((t) => t.query === value.query),
    );

    setResults(combinedResults);
  }, [staticResults, historyResults, autoResults, pauseSuggestions]);

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
    const newHistory = [...history];
    const index = newHistory.findIndex((item) => item.query === result.query);

    if (index < 0) {
      return;
    }

    newHistory?.splice(index, 1);

    await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));

    setHistory(newHistory);
    showToast(Toast.Style.Success, "Removed from history");
  }

  async function search(query: string) {
    console.log('pauseSuggestions', pauseSuggestions);

    // user changed the search text, so we want to show new results
    console.log(query)
    if (query.length === 0) {
      setPauseSuggestions(false);
    }

    setSearchText(query);
  }

  return {
    isLoading,
    results,
    searchText,
    setSearchText,
    search,
    pauseSuggestions,
    setPauseSuggestions,
    selectedItemId,
    setSelectedItemId,
    history,
    addHistory,
    deleteAllHistory,
    deleteHistoryItem,
  };
}
