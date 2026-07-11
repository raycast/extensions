import { showToast, Toast } from "@raycast/api";
import { useEffect, useMemo, useRef, useState } from "react";
import yahooFinance, { Quote } from "./yahoo-finance";

export function useStockInfo(symbols: string[]): {
  quotes: Record<string, Quote>;
  isLoading: boolean;
  lastUpdated: Date | null;
  resetQuotes: () => void;
} {
  const abortable = useRef<AbortController>(new AbortController());
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Stable signature so the effect only re-runs when the symbol set changes content-wise.
  const symbolsKey = useMemo(() => [...symbols].sort().join(","), [symbols]);

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
            Object.fromEntries(
              quoteResponse.result
                .filter((q): q is Quote & { symbol: string } => !!q.symbol && symbols.includes(q.symbol))
                .map((q) => [q.symbol, q]),
            ),
          );
          setLastUpdated(new Date());
        }
      } catch (e) {
        if (e instanceof Error && e.name !== "AbortError") {
          await showToast({ style: Toast.Style.Failure, title: "Error", message: e.message });
        }
      } finally {
        setIsLoading(false);
      }
    };
    update();
    return () => abortable.current?.abort();
  }, [symbolsKey]);

  return { quotes, isLoading, lastUpdated, resetQuotes: () => setQuotes({}) };
}
