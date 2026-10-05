import { useCachedPromise } from "@raycast/utils";
import { fetchExchangers } from "../api/client";

export function useExchangers() {
  return useCachedPromise(fetchExchangers, [], {
    keepPreviousData: true,
  });
}
