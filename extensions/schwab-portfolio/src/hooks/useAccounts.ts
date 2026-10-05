import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { getAccounts, getAccountNumbers } from "../lib/schwab-client";

export function useAccountNumbers(execute = true) {
  return useCachedPromise(async () => getAccountNumbers(), [], {
    keepPreviousData: true,
    execute,
    onError: (error) => {
      void showFailureToast(error, { title: "Failed to load Schwab accounts" });
    },
  });
}

export function useAccounts(execute = true) {
  return useCachedPromise(async () => getAccounts("positions"), [], {
    keepPreviousData: true,
    execute,
    onError: (error) => {
      void showFailureToast(error, { title: "Failed to load portfolio" });
    },
  });
}
