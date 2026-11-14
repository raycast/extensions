import { useCachedPromise } from "@raycast/utils";
import { useRef } from "react";
import { fetchChart, isPriceChartLoading, priceChartKey, type ChartRange, type PriceSeries } from "../lib/yahoo/chart";

export function usePriceChart(
  symbol: string | null,
  range: ChartRange,
): { series: PriceSeries | undefined; isLoading: boolean } {
  const key = priceChartKey(symbol, range);
  // Key of the request in flight, and of the latest one that settled (usePromise only reports the latest call).
  const pendingKey = useRef<string | null>(null);
  const settledKey = useRef<string | null>(null);
  const settle = () => {
    settledKey.current = pendingKey.current;
  };
  const { data, isLoading } = useCachedPromise(fetchChart, [symbol ?? "", range], {
    execute: symbol !== null,
    onWillExecute: ([s, r]) => {
      pendingKey.current = priceChartKey(s, r);
    },
    onData: settle,
    // A missing chart renders as "Price chart unavailable"; no toast.
    onError: settle,
  });
  if (key === null) return { series: undefined, isLoading: false };
  return {
    series: data,
    isLoading: isPriceChartLoading({ key, settledKey: settledKey.current, isLoading, hasData: data !== undefined }),
  };
}
