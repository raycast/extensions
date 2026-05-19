import { showToast, Toast } from "@raycast/api";
import { useEffect, useMemo, useRef, useState } from "react";
import yahooFinance, { type Quote } from "./yahoo-finance";

export function useStockInfo(symbols: string[]): {
  quotes: Record<string, Quote>;
  isLoading: boolean;
  lastUpdated: Date | null;
  resetQuotes: () => void;
} {
  const abortRef = useRef<AbortController>(new AbortController());
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const symbolsKey = useMemo(() => [...symbols].sort().join(","), [symbols]);

  useEffect(() => {
    if (symbols.length === 0) {
      setQuotes({});
      return;
    }

    abortRef.current?.abort();
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;

    (async () => {
      setIsLoading(true);
      try {
        const result = await yahooFinance.quote(symbols, signal);
        const map: Record<string, Quote> = {};
        for (const q of result) {
          if (q.symbol && symbols.includes(q.symbol)) {
            map[q.symbol] = q;
          }
        }
        setQuotes(map);
        setLastUpdated(new Date());
      } catch (e) {
        if (e instanceof Error && e.name !== "AbortError") {
          showToast({
            style: Toast.Style.Failure,
            title: "Error",
            message: e.message,
          });
        }
      } finally {
        setIsLoading(false);
      }
    })();

    return () => abortRef.current?.abort();
  }, [symbolsKey]);

  return { quotes, isLoading, lastUpdated, resetQuotes: () => setQuotes({}) };
}
