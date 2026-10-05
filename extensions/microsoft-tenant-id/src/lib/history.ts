import { useCallback, useRef } from "react";
import { LocalStorage } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import type { CloudKey, TenantResult } from "./tenant";

export interface HistoryItem {
  domain: string;
  tenantId: string;
  cloud?: CloudKey;
  cloudLabel?: string;
  brandName?: string;
  namespaceType?: string;
  regionScope?: string;
  timestamp: number;
}

const HISTORY_KEY = "tenant-lookup-history";
const MAX_ITEMS = 25;

function toItem(result: TenantResult): HistoryItem {
  return {
    domain: result.domain,
    tenantId: result.tenantId as string,
    cloud: result.cloud,
    cloudLabel: result.cloudLabel,
    brandName: result.brandName,
    namespaceType: result.namespaceType,
    regionScope: result.regionScope,
    timestamp: Date.now(),
  };
}

/** Persisted "recent lookups" list, most-recent first, de-duplicated by domain. */
export function useHistory() {
  const { value, setValue, isLoading } = useLocalStorage<HistoryItem[]>(HISTORY_KEY, []);
  const history = value ?? [];

  // Serialize every write and base it on the freshest persisted value, so overlapping bulk
  // lookups can't each start from a stale snapshot and silently drop one another's entries.
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const mutate = useCallback(
    (update: (current: HistoryItem[]) => HistoryItem[]) => {
      const run = queue.current.then(async () => {
        const raw = await LocalStorage.getItem<string>(HISTORY_KEY);
        const current: HistoryItem[] = raw ? JSON.parse(raw) : [];
        await setValue(update(current));
      });
      queue.current = run.catch(() => undefined);
      return queue.current;
    },
    [setValue],
  );

  /** Record one or more successful lookups in a single atomic update (bulk-safe). */
  const record = useCallback(
    (results: TenantResult[]) => {
      const items = results.filter((r) => r.tenantId).map(toItem);
      if (items.length === 0) return Promise.resolve(undefined);
      const incoming = new Set(items.map((i) => i.domain));
      return mutate((current) => [...items, ...current.filter((h) => !incoming.has(h.domain))].slice(0, MAX_ITEMS));
    },
    [mutate],
  );

  const remove = useCallback(
    (domain: string) => mutate((current) => current.filter((h) => h.domain !== domain)),
    [mutate],
  );

  const clear = useCallback(() => mutate(() => []), [mutate]);

  return { history, isLoading, record, remove, clear };
}
