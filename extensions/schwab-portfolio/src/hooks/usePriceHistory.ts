import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { getPriceHistory } from "../lib/schwab-client";
import { getTimeframe } from "../lib/constants";

export function usePriceHistory(symbol: string, timeframeValue: string) {
  return useCachedPromise(
    // timeframeValue must be a hook argument (not just closed over) so that
    // changing the timeframe triggers a refetch instead of reusing the cache.
    async (sym: string, timeframe: string) => {
      const tf = getTimeframe(timeframe);
      return getPriceHistory(sym, tf.periodType, tf.period, tf.frequencyType, tf.frequency);
    },
    [symbol, timeframeValue],
    {
      keepPreviousData: true,
      execute: !!symbol,
      onError: (error) => {
        void showFailureToast(error, { title: "Failed to load price history" });
      },
    },
  );
}
