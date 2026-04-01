import { useCachedPromise } from "@raycast/utils";
import { fetchExchangers } from "../api/client";
import type { Locale } from "../api/types";

export function useExchangers(locale: Locale) {
  return useCachedPromise(fetchExchangers, [locale], {
    keepPreviousData: true,
  });
}
