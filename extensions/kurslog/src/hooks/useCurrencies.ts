import { useCachedPromise } from "@raycast/utils";
import { fetchCurrencies } from "../api/client";
import type { Locale } from "../api/types";

export function useCurrencies(locale: Locale) {
  return useCachedPromise(fetchCurrencies, [locale], {
    keepPreviousData: true,
  });
}
