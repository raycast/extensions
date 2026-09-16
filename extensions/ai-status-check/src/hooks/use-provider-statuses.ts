import { Cache } from "@raycast/api";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { ProviderDefinition } from "../providers/types";
import { ProviderStatusStore } from "../services/provider-status-store";
import { SnapshotCache } from "../services/status-cache";

export function useProviderStatuses(providers: readonly ProviderDefinition[]) {
  const stableProviders = useStableProviders(providers);
  const [cache] = useState(() => new SnapshotCache(new Cache()));
  const store = useMemo(() => new ProviderStatusStore(stableProviders, cache), [stableProviders, cache]);
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot);
  useEffect(() => {
    void store.refreshAll(false);
    return () => store.cancel();
  }, [store]);
  return {
    ...state,
    store,
    isInitialLoading:
      state.isRefreshing &&
      !Object.values(state.records).some(
        (record) => record.snapshot && record.freshness !== "expired" && record.freshness !== "unavailable",
      ),
    refreshAll: store.refreshAll,
  };
}

function useStableProviders(providers: readonly ProviderDefinition[]): readonly ProviderDefinition[] {
  const stable = useRef(providers);
  if (
    stable.current.length !== providers.length ||
    stable.current.some((provider, index) => provider !== providers[index])
  )
    stable.current = providers;
  return stable.current;
}
