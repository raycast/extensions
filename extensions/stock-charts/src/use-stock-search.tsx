import { showToast, Toast } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { useStockInfo } from "./use-stock-info";
import yahooFinance, { type Quote } from "./yahoo-finance";

export function useStockSearch(searchText: string) {
  const abortRef = useRef<AbortController>(new AbortController());
  const prevSymbolsKey = useRef<string>("");
  const [symbols, setSymbols] = useState<string[]>([]);
  const {
    quotes,
    isLoading: quotesLoading,
    lastUpdated,
    resetQuotes,
  } = useStockInfo(symbols);
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<Quote[]>([]);

  useEffect(() => {
    if (!quotesLoading) setIsLoading(false);
  }, [quotesLoading]);

  useEffect(() => {
    if (!isLoading) {
      setSearchResults(
        symbols.map((s) => quotes[s]).filter((q): q is Quote => !!q),
      );
    }
  }, [isLoading, quotes, symbols]);

  useEffect(() => {
    if (searchText.length === 0) {
      resetQuotes();
      setSymbols([]);
      prevSymbolsKey.current = "";
      return;
    }

    abortRef.current?.abort();
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;

    (async () => {
      setIsLoading(true);
      try {
        const res = await yahooFinance.search(searchText, signal);
        const next = res.quotes
          .filter((q) => q.quoteType === "EQUITY" || q.quoteType === "ETF")
          .map((q) => q.symbol)
          .filter((s): s is string => !!s);
        const nextKey = next.join(",");
        setSymbols(next);
        if (next.length === 0 || nextKey === prevSymbolsKey.current) {
          // Same symbol set or empty — useStockInfo won't re-fetch, clear spinner now.
          // Quotes are still cached so searchResults will populate correctly.
          setIsLoading(false);
        }
        prevSymbolsKey.current = nextKey;
      } catch (e) {
        if (e instanceof Error && e.name !== "AbortError") {
          showToast({
            style: Toast.Style.Failure,
            title: "Search Error",
            message: e.message,
          });
        }
        setIsLoading(false);
      }
    })();

    return () => abortRef.current?.abort();
  }, [searchText, resetQuotes]);

  return { searchResults, isLoading, lastUpdated };
}
