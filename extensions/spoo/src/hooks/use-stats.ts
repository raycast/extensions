import { useMemo } from "react";
import { useCachedPromise, withCache } from "@raycast/utils";
import { getStats, type StatsOptions } from "@/api/stats";

const STATS_TTL_MS = 60_000;

const fetchStatsCached = withCache(
  (options: StatsOptions) => getStats(options),
  { maxAge: STATS_TTL_MS },
);

export function useStats(options: StatsOptions) {
  // Stable string key — same contents → same key → no re-fire across renders.
  const key = useMemo(() => JSON.stringify(options), [options]);

  const { data, isLoading, error, revalidate } = useCachedPromise(
    async (serialized: string) =>
      fetchStatsCached(JSON.parse(serialized) as StatsOptions),
    [key],
    { keepPreviousData: true },
  );

  return {
    stats: data,
    isLoading: isLoading && !data,
    error,
    revalidate,
  };
}
