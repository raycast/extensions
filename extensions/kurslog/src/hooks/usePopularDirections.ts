import { useCachedPromise } from "@raycast/utils";
import { fetchPopularDirections } from "../api/client";
import type { Locale } from "../api/types";

export function usePopularDirections(locale: Locale, limit = 30) {
  return useCachedPromise(fetchPopularDirections, [locale, limit], {
    keepPreviousData: true,
  });
}
