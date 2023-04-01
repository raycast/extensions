import { showToast, Toast } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { useStockInfo } from "./use-stock-info";
import yahooFinance, { Quote } from "./yahoo-finance";

export function useStockSearch(searchText: string) {
  const abortable = useRef<AbortController>(new AbortController());
  const [symbols, setSymbols] = useState<string[]>([]);
  const { quotes, isLoading: quotesIsLoading, resetQuotes } = useStockInfo(symbols);
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<Quote[]>([]);

  // Only set isLoading to false when quotesIsLoading goes from true to false to prevent flickering
  useEffect(() => {
    if (!quotesIsLoading) {
      setIsLoading(false);
    }
  }, [quotesIsLoading]);

  // Keep previous results until we have new results
  useEffect(() => {
    if (!isLoading) {
      setSearchResults(symbols.map((s) => quotes[s]).filter((q): q is Quote => !!q));
    }
  }, [isLoading, quotes, symbols]);

  useEffect(() => {
    const update = async () => {
      resetQuotes();
      if (searchText.length === 0) {
        return;
      }

      abortable.current?.abort();
      abortable.current = new AbortController();

      setIsLoading(true);
      try {
        const searchResponse = await yahooFinance.search(searchText, abortable.current.signal);
        const symbols = searchResponse.quotes.map((q) => q.symbol).filter((s): s is string => !!s);
        setSymbols(symbols);
        if (symbols.length === 0) {
          setIsLoading(false);
        }
      } catch (e) {
        if (e instanceof Error) {
          if (e.name !== "AbortError") {
            await showToast({ style: Toast.Style.Failure, title: "Error", message: e.message });
          }
          setIsLoading(false);
          return;
        }
      }
    };
    update();
  }, [searchText]);

  return { searchResults, isLoading };
}
