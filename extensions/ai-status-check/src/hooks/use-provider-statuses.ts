import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getDataFreshness } from "../domain/freshness";
import type { ProviderStatusRecord } from "../domain/types";
import type { ProviderDefinition } from "../providers/types";
import { recordFromCache, refreshProviderStatuses, refreshProviderStatus } from "../services/fetch-provider-statuses";
import { ProviderRequestOrder } from "../services/provider-request-order";
import { RaycastStatusCache, type StatusCache } from "../services/status-cache";

type StatusRecords = Record<string, ProviderStatusRecord>;

interface ProviderStatuses {
  records: StatusRecords;
  isRefreshing: boolean;
  isInitialLoading: boolean;
  refreshAll(force?: boolean): Promise<ProviderStatusRecord[]>;
  refreshProvider(providerId: string): Promise<ProviderStatusRecord | undefined>;
}

export function useProviderStatuses(providers: readonly ProviderDefinition[]): ProviderStatuses {
  const stableProviders = useStableProviders(providers);
  const [cache] = useState<StatusCache>(() => new RaycastStatusCache());
  const providerById = useMemo(
    () => new Map(stableProviders.map((provider) => [provider.id, provider])),
    [stableProviders],
  );
  const [records, setRecords] = useState<StatusRecords>(() => recordsFromCache(stableProviders, cache));
  const [isRefreshing, setIsRefreshing] = useState(() => providersNeedRefresh(stableProviders, cache));
  const abortController = useRef<AbortController | undefined>(undefined);
  const generation = useRef(0);
  const requestOrder = useRef(new ProviderRequestOrder());

  const refreshAll = useCallback(
    async (force = true) => {
      abortController.current?.abort();
      const controller = new AbortController();
      abortController.current = controller;
      const currentGeneration = ++generation.current;
      const requestTokens = new Map(
        stableProviders.map((provider) => [provider.id, requestOrder.current.begin(provider.id)]),
      );
      setIsRefreshing(force || providersNeedRefresh(stableProviders, cache));

      try {
        const results = await refreshProviderStatuses(stableProviders, {
          cache,
          force,
          isCurrent: (providerId) => requestOrder.current.isCurrent(providerId, requestTokens.get(providerId)),
          signal: controller.signal,
        });
        if (generation.current === currentGeneration) {
          const currentResults = results.filter((result) =>
            requestOrder.current.isCurrent(result.providerId, requestTokens.get(result.providerId)),
          );
          setRecords((current) => mergeResults(current, currentResults));
        }
        return results;
      } finally {
        if (generation.current === currentGeneration) setIsRefreshing(false);
      }
    },
    [cache, stableProviders],
  );

  const refreshProvider = useCallback(
    async (providerId: string) => {
      const provider = providerById.get(providerId);
      if (!provider) throw new Error(`Unknown provider: ${providerId}`);
      const requestToken = requestOrder.current.begin(providerId);

      setRecords((current) => ({
        ...current,
        [providerId]: {
          ...(current[providerId] ?? recordFromCache(providerId, cache)),
          refreshState: "refreshing",
          refreshError: undefined,
        },
      }));

      const result = await refreshProviderStatus(provider, {
        cache,
        force: true,
        isCurrent: () => requestOrder.current.isCurrent(providerId, requestToken),
      });
      if (!requestOrder.current.isCurrent(providerId, requestToken)) return undefined;
      setRecords((current) => ({ ...current, [providerId]: result }));
      return result;
    },
    [cache, providerById],
  );

  useEffect(() => {
    setRecords(recordsFromCache(stableProviders, cache));
    void refreshAll(false);

    return () => abortController.current?.abort();
  }, [cache, stableProviders, refreshAll]);

  return {
    records,
    isRefreshing,
    isInitialLoading: isRefreshing && !hasDisplayableSnapshot(records),
    refreshAll,
    refreshProvider,
  };
}

function useStableProviders(providers: readonly ProviderDefinition[]): readonly ProviderDefinition[] {
  const stableProviders = useRef(providers);
  const changed =
    stableProviders.current.length !== providers.length ||
    stableProviders.current.some((provider, index) => provider !== providers[index]);

  if (changed) stableProviders.current = providers;
  return stableProviders.current;
}

function recordsFromCache(providers: readonly ProviderDefinition[], cache: StatusCache): StatusRecords {
  return Object.fromEntries(providers.map((provider) => [provider.id, recordFromCache(provider.id, cache)]));
}

function providersNeedRefresh(providers: readonly ProviderDefinition[], cache: StatusCache): boolean {
  return providers.some((provider) => getDataFreshness(cache.getSnapshot(provider.id)) !== "fresh");
}

function hasDisplayableSnapshot(records: StatusRecords): boolean {
  return Object.values(records).some(
    (record) => record.snapshot && record.freshness !== "expired" && record.freshness !== "unavailable",
  );
}

function mergeResults(current: StatusRecords, results: readonly ProviderStatusRecord[]): StatusRecords {
  const next = { ...current };
  for (const result of results) next[result.providerId] = result;
  return next;
}
