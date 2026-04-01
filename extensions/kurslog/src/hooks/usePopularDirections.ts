import { useCachedPromise } from "@raycast/utils";
import { fetchPopularDirections } from "../api/client";
import type { Locale } from "../api/types";

export function usePopularDirections(locale: Locale) {
  return useCachedPromise(fetchPopularDirections, [locale, 30], {
    keepPreviousData: true,
  });
}
