import { useCallback } from "react";
import { useLocalStorage } from "@raycast/utils";
import type { TenantResult } from "./tenant";

export interface HistoryItem {
  domain: string;
  tenantId: string;
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

  /** Record one or more successful lookups in a single atomic update (bulk-safe). */
  const record = useCallback(
    async (results: TenantResult[]) => {
      const items = results.filter((r) => r.tenantId).map(toItem);
      if (items.length === 0) return;
      const incoming = new Set(items.map((i) => i.domain));
      const previous = (value ?? []).filter((h) => !incoming.has(h.domain));
      await setValue([...items, ...previous].slice(0, MAX_ITEMS));
    },
    [value, setValue],
  );

  const remove = useCallback(
    async (domain: string) => {
      await setValue((value ?? []).filter((h) => h.domain !== domain));
    },
    [value, setValue],
  );

  const clear = useCallback(async () => {
    await setValue([]);
  }, [setValue]);

  return { history, isLoading, record, remove, clear };
}
