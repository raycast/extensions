import { useEffect, useRef, useState } from "react";
import { showToast, Toast } from "@raycast/api";
import { searchStocks, fetchQuote, Quote, SearchResult } from "./google-finance";

export function useStockSearch(query: string) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [quotes, setQuotes] = useState<Map<string, Quote>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const prevResultsRef = useRef<SearchResult[]>([]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setQuotes(new Map());
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);

    (async () => {
      try {
        const searchResults = await searchStocks(query, controller.signal);
        if (searchResults.length > 0) {
          setResults(searchResults);
          setQuotes(new Map());
          prevResultsRef.current = searchResults;

          // Stream quote updates so the first rows render quickly.
          const nextQuotes = new Map<string, Quote>();
          const unresolved = [...searchResults];
          const workerCount = Math.min(5, unresolved.length);

          await Promise.all(
            Array.from({ length: workerCount }, async () => {
              while (unresolved.length > 0) {
                const result = unresolved.shift();
                if (!result) {
                  return;
                }

                const quote = await fetchQuote(result.symbol, result.exchange || undefined, controller.signal);
                if (quote) {
                  nextQuotes.set(result.symbol, quote);
                  setQuotes(new Map(nextQuotes));
                }
              }
            }),
          );
        } else {
          // Keep previous results while showing no new results
          setResults([]);
          setQuotes(new Map());
        }
        setIsLoading(false);
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          // Notify the user of network/search failures
          // Fire-and-forget so we don't block UI
          showToast(Toast.Style.Failure, "Stock search failed", (e as Error).message || "");
          setIsLoading(false);
        }
      }
    })();

    return () => controller.abort();
  }, [query]);

  // Show previous results while loading new ones
  const displayResults = results.length > 0 ? results : isLoading ? prevResultsRef.current : [];

  return { results: displayResults, quotes, isLoading };
}
