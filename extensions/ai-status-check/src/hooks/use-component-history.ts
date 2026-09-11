import { useCallback, useEffect, useSyncExternalStore } from "react";
import type { ProviderStatusStore } from "../services/provider-status-store";

export function useComponentHistory(
  store: ProviderStatusStore,
  providerId: string,
  componentId: string,
  fetchedAt: string | undefined,
  selected: boolean,
) {
  const getHistory = useCallback(
    () => store.getComponentHistory(providerId, componentId),
    [store, providerId, componentId],
  );
  const state = useSyncExternalStore(store.subscribe, getHistory);
  useEffect(() => {
    if (selected) return store.watchComponentHistory(providerId, componentId);
  }, [store, providerId, componentId, fetchedAt, selected]);
  return state;
}
