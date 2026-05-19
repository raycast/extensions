import { useEffect, useMemo, useRef, useState } from "react";
import type { Interval } from "./types";
import yahooFinance from "./yahoo-finance";

export interface IntervalChange {
  changePercent: number;
  change: number;
}

export function useIntervalChanges(
  symbols: string[],
  interval: Interval,
): { changes: Record<string, IntervalChange>; isLoading: boolean } {
  const abortRef = useRef<AbortController>(new AbortController());
  const [changes, setChanges] = useState<Record<string, IntervalChange>>({});
  const [isLoading, setIsLoading] = useState(false);

  const symbolsKey = useMemo(() => [...symbols].sort().join(","), [symbols]);

  useEffect(() => {
    if (symbols.length === 0 || interval === "1D") {
      setChanges({});
      return;
    }

    abortRef.current?.abort();
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;

    (async () => {
      setIsLoading(true);
      try {
        const results = await Promise.allSettled(
          symbols.map((sym) => yahooFinance.fetchChart(sym, interval, signal)),
        );

        const map: Record<string, IntervalChange> = {};
        for (let i = 0; i < symbols.length; i++) {
          const result = results[i];
          if (result.status !== "fulfilled") continue;
          const { closes } = result.value;
          if (closes.length < 2) continue;
          const first = closes[0];
          const last = closes[closes.length - 1];
          if (first === 0) continue;
          map[symbols[i]] = {
            change: last - first,
            changePercent: ((last - first) / first) * 100,
          };
        }
        setChanges(map);
      } catch {
        // aborted or network error — keep stale data
      } finally {
        setIsLoading(false);
      }
    })();

    return () => abortRef.current?.abort();
  }, [symbolsKey, interval]);

  return { changes, isLoading };
}
