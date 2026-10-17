import { useCachedPromise } from "@raycast/utils";
import { fetchCurrencies } from "../api/client";

export function useCurrencies() {
  return useCachedPromise(fetchCurrencies, [], {
    keepPreviousData: true,
  });
}
