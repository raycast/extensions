import { showToast, Toast } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import yahooFinance, { Quote } from "./yahoo-finance";

export function useStockInfo(symbols: string[]): {
  quotes: Record<string, Quote>;
  isLoading: boolean;
  resetQuotes: () => void;
} {
  const abortable = useRef<AbortController>(new AbortController());
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const update = async () => {
      if (symbols.length === 0) {
        setQuotes({});
        return;
      }

      abortable.current?.abort();
      abortable.current = new AbortController();

      setIsLoading(true);

      try {
        const quoteResponse = await yahooFinance.quote(symbols, abortable.current.signal);
        if (!quoteResponse || !quoteResponse.result) {
          setQuotes({});
        } else {
          setQuotes(
            quoteResponse.result.reduce((acc, quote) => {
              if (quote.symbol && symbols.includes(quote.symbol)) {
                acc[quote.symbol] = quote;
              }
              return acc;
            }, {} as Record<string, Quote>)
          );
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

      setIsLoading(false);
    };
    update();
  }, [
    // Don't re-fetch if the set of symbols hasn't changed
    JSON.stringify([...symbols].sort()),
  ]);

  return { quotes, isLoading, resetQuotes: () => setQuotes({}) };
}
