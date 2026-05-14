import { useCallback } from "react";
import { useCachedPromise, useLocalStorage } from "@raycast/utils";
import { sb } from "./supabase";
import type { Model } from "./types";

export function usePinnedModels(maxPins: number = 10) {
  const { value: pinnedIds = [], setValue: setPinnedIds } = useLocalStorage<string[]>("ai-stats-pinned-ids", []);

  const addPin = useCallback(
    async (id: string) => {
      const next = [id, ...pinnedIds.filter((x) => x !== id)].slice(0, maxPins);
      await setPinnedIds(next);
    },
    [pinnedIds, setPinnedIds, maxPins],
  );

  const removePin = useCallback(
    async (id: string) => {
      const next = pinnedIds.filter((x) => x !== id);
      await setPinnedIds(next);
    },
    [pinnedIds, setPinnedIds],
  );

  const movePin = useCallback(
    async (id: string, delta: number) => {
      const idx = pinnedIds.indexOf(id);
      if (idx === -1) return;
      const next = pinnedIds.slice();
      const newIdx = Math.max(0, Math.min(next.length - 1, idx + delta));
      next.splice(idx, 1);
      next.splice(newIdx, 0, id);
      await setPinnedIds(next);
    },
    [pinnedIds, setPinnedIds],
  );

  return { pinnedIds, addPin, removePin, movePin } as const;
}

// Universal pinned models data hook
// Usage: const { pinnedModels } = usePinnedModelsData("id,name,slug,creator_name,metric")
export function usePinnedModelsData(columns: string, overridePinnedIds?: string[]) {
  const { value: lsPinnedIds = [] } = useLocalStorage<string[]>("ai-stats-pinned-ids", []);
  const effectiveIds = (overridePinnedIds ?? lsPinnedIds ?? []).filter(Boolean);
  const idsKey = effectiveIds.join(",");
  const {
    data = [],
    isLoading,
    revalidate,
    mutate,
    error,
  } = useCachedPromise(
    async (idsCsv: string, cols: string) => {
      if (!idsCsv) return [] as Model[];
      const ids = idsCsv.split(",").filter(Boolean);
      if (ids.length === 0) return [] as Model[];
      const client = sb();
      const { data, error } = await client.from("aa_models").select(cols).in("id", ids);
      if (error) throw error;
      return (data ?? []) as unknown as Model[];
    },
    [idsKey, columns],
    { keepPreviousData: true },
  );

  return { pinnedModels: data as Model[], isLoading, revalidate, mutate, error } as const;
}

// Split rows into pinned and unpinned based on pinnedIds, preserving order of pinnedIds
export function splitPinned<T extends { id: string }>(rows: T[], pinnedIds: string[]) {
  const set = new Set(pinnedIds);
  const pinned = rows.filter((r) => set.has(r.id)).sort((a, b) => pinnedIds.indexOf(a.id) - pinnedIds.indexOf(b.id));
  const unpinned = rows.filter((r) => !set.has(r.id));
  return { pinned, unpinned } as const;
}

// Order an array of pinned items by pinnedIds
export function orderPinned<T extends { id: string }>(items: T[], pinnedIds: string[]) {
  return [...items].sort((a, b) => pinnedIds.indexOf(a.id) - pinnedIds.indexOf(b.id));
}
