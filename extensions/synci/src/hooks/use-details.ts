import { useCachedState } from "@raycast/utils";

/** Persist presentation choices only, never account or transaction data. */
export function useDetails(view: string, initial = false) {
  return useCachedState<boolean>(`details-${view}`, initial, { cacheNamespace: "synci-views" });
}
