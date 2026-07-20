import { useCachedPromise } from "@raycast/utils";
import { fetchAllRates, flattenRates } from "../api/client";
import type { RateItem } from "../api/types";

export function useAllRates(from: string, to: string, cityUrl?: string) {
  return useCachedPromise(
    async (f: string, t: string, city?: string): Promise<RateItem[]> => {
      const exchangers = await fetchAllRates(f, t, city);
      return flattenRates(exchangers);
    },
    [from, to, cityUrl],
    {
      keepPreviousData: true,
      execute: !!from && !!to,
    },
  );
}
