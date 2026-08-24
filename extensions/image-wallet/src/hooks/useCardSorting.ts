import { useCallback, useEffect, useState } from "react";
import { DEFAULT_SORT_MODE, loadSortMode, saveSortMode } from "../lib/sortPreference";
import { loadUsageStats, pruneUsageStats, recordUsage } from "../lib/usageStats";
import { Pocket, SortMode, UsageStats } from "../types";

/**
 * Owns the chosen sort mode and the usage stats that the "Recently Used" and "Most Used"
 * modes sort by. Both live in LocalStorage, so the choice survives relaunches.
 */
export function useCardSorting(pockets: Pocket[] | undefined) {
  const [sortMode, setSortModeState] = useState<SortMode>(DEFAULT_SORT_MODE);
  const [usage, setUsage] = useState<UsageStats>({});
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const [mode, stats] = await Promise.all([loadSortMode(), loadUsageStats()]);
      setSortModeState(mode);
      setUsage(stats);
      setIsLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!pockets || pockets.length === 0) return;
    const validPaths = new Set(pockets.flatMap((pocket) => pocket.cards).map((card) => card.path));
    pruneUsageStats(validPaths).then(setUsage);
  }, [pockets]);

  const setSortMode = useCallback((mode: SortMode) => {
    setSortModeState(mode);
    saveSortMode(mode);
  }, []);

  const markUsed = useCallback(async (path: string) => {
    setUsage(await recordUsage(path));
  }, []);

  return { sortMode, setSortMode, usage, markUsed, isSortLoaded: isLoaded };
}
