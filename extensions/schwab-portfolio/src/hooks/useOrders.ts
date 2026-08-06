import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { getOrders } from "../lib/schwab-client";

export function useOrders(days = 30) {
  return useCachedPromise((lookback: number) => getOrders(lookback), [days], {
    keepPreviousData: true,
    onError: (error) => {
      void showFailureToast(error, { title: "Failed to load orders" });
    },
  });
}
