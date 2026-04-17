import { useCachedPromise } from "@raycast/utils";
import { fetchAllRates, flattenRates } from "../api/client";
import type { RateItem } from "../api/types";

export function useAllRates(from: string, to: string) {
  return useCachedPromise(
    async (f: string, t: string): Promise<RateItem[]> => {
      const exchangers = await fetchAllRates(f, t);
      return flattenRates(exchangers);
    },
    [from, to],
    {
      keepPreviousData: true,
      execute: !!from && !!to,
    },
  );
}
