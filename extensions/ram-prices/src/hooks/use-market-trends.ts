import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { getMarketTrends } from "../data/get-market-trends";

export function useMarketTrends() {
  return useCachedPromise(getMarketTrends, [], {
    keepPreviousData: true,
    onError: async (error) => {
      await showFailureToast(error, { title: "Could not load RAM market trends" });
    },
  });
}
