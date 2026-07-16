import { useCachedPromise } from "@raycast/utils";
import { getPriceHistory } from "../lib/schwab-client";
import { getTimeframe } from "../lib/constants";

export function usePriceHistory(symbol: string, timeframeValue: string) {
  const tf = getTimeframe(timeframeValue);

  return useCachedPromise(
    async (sym: string) => getPriceHistory(sym, tf.periodType, tf.period, tf.frequencyType, tf.frequency),
    [symbol],
    {
      keepPreviousData: true,
      execute: !!symbol,
    },
  );
}
