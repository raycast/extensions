import { useCachedPromise } from "@raycast/utils";
import { getAccounts, getAccountNumbers } from "../lib/schwab-client";

export function useAccountNumbers(execute = true) {
  return useCachedPromise(async () => getAccountNumbers(), [], {
    keepPreviousData: true,
    execute,
  });
}

export function useAccounts(execute = true) {
  return useCachedPromise(async () => getAccounts("positions"), [], {
    keepPreviousData: true,
    execute,
  });
}
