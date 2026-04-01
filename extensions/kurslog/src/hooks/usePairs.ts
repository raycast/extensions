import { useCachedPromise } from "@raycast/utils";
import { fetchPairs } from "../api/client";
import type { Locale } from "../api/types";

export function usePairs(locale: Locale) {
  return useCachedPromise(fetchPairs, [locale], {
    keepPreviousData: true,
  });
}
