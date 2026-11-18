import { useEffect, useState } from "react";
import { fetchQuotes, Quote } from "./google-finance";

export function useStockInfo(symbols: { symbol: string; exchange?: string }[]) {
  const [quotes, setQuotes] = useState<Map<string, Quote>>(new Map());
  const [isLoading, setIsLoading] = useState(false);

  const key = symbols
    .map((s) => `${s.symbol}:${s.exchange || ""}`)
    .sort()
    .join(",");

  useEffect(() => {
    if (symbols.length === 0) {
      setQuotes(new Map());
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);

    fetchQuotes(symbols, controller.signal)
      .then((result) => {
        setQuotes(result);
        setIsLoading(false);
      })
      .catch((e) => {
        if (e.name !== "AbortError") {
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, [key]);

  return { quotes, isLoading };
}
