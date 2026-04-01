import { useCachedPromise } from "@raycast/utils";
import { fetchAllRates, flattenRates } from "../api/client";
import type { Locale, RateItem } from "../api/types";

export function useAllRates(from: string, to: string, locale: Locale) {
  return useCachedPromise(
    async (f: string, t: string, loc: Locale): Promise<RateItem[]> => {
      const exchangers = await fetchAllRates(f, t, loc);
      return flattenRates(exchangers);
    },
    [from, to, locale],
    {
      keepPreviousData: true,
      execute: !!from && !!to,
    },
  );
}
