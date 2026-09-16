import { useCallback, useSyncExternalStore } from "react";
import type { ProviderStatusStore } from "../services/provider-status-store";

export function useProviderRecord(store: ProviderStatusStore, providerId: string) {
  const getRecord = useCallback(() => store.getSnapshot().records[providerId]!, [store, providerId]);
  const record = useSyncExternalStore(store.subscribe, getRecord);
  const refresh = useCallback(async () => {
    await store.refreshProvider(providerId);
  }, [store, providerId]);
  return { record, refresh };
}
