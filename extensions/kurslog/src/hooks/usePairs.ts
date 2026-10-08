import { useCachedPromise } from "@raycast/utils";
import { fetchPairs } from "../api/client";

export function usePairs() {
  return useCachedPromise(fetchPairs, [], {
    keepPreviousData: true,
  });
}
