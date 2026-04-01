import { useCachedPromise } from "@raycast/utils";
import { fetchTopRates } from "../api/client";
import type { Locale } from "../api/types";

export function useTopRates(
  from: string,
  to: string,
  locale: Locale,
  limit = 10,
) {
  return useCachedPromise(fetchTopRates, [from, to, locale, limit], {
    keepPreviousData: true,
    execute: !!from && !!to,
  });
}
