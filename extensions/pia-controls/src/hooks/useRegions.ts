import { useMemo } from "react";
import { useCachedPromise, useLocalStorage } from "@raycast/utils";
import { loadRegions, FAVORITES_KEY, RECENTS_KEY } from "../lib/regions";
import { Region } from "../types";

export function useRegions(cliPath: string | undefined) {
  const { data, isLoading } = useCachedPromise(
    async (path: string | undefined): Promise<Region[]> => (path ? loadRegions(path) : []),
    [cliPath],
    { keepPreviousData: true, initialData: [] as Region[] },
  );

  const regions = data ?? [];
  const byId = useMemo(() => {
    const m = new Map<string, Region>();
    for (const r of regions) m.set(r.id, r);
    return m;
  }, [regions]);

  return { regions, byId, isLoading };
}

export function useFavorites() {
  const { value, setValue } = useLocalStorage<string[]>(FAVORITES_KEY, []);
  const favorites = useMemo(() => new Set(value ?? []), [value]);

  const toggle = async (regionId: string) => {
    const next = new Set(favorites);
    if (next.has(regionId)) next.delete(regionId);
    else next.add(regionId);
    await setValue([...next]);
  };

  return { favorites, toggle };
}

export function useRecents() {
  const { value } = useLocalStorage<Region[]>(RECENTS_KEY, []);
  return value ?? [];
}
