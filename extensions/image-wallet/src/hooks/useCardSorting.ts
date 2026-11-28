import { useCallback, useEffect, useState } from "react";
import { DEFAULT_SORT_MODE, loadSortMode, saveSortMode } from "../lib/sortPreference";
import { pruneUsageStats, readUsageStats, recordUsage } from "../lib/usageStats";
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
    let cancelled = false;

    (async () => {
      // Apply usage as soon as the locked read returns. Waiting on loadSortMode via
      // Promise.all would let a paste/prune complete first, then overwrite it with this
      // snapshot and revert Recently Used / Most Used until the next mutation.
      const modePromise = loadSortMode();
      const stats = await readUsageStats();
      if (cancelled) return;
      setUsage(stats);

      const mode = await modePromise;
      if (cancelled) return;
      setSortModeState(mode);
      setIsLoaded(true);
    })();

    return () => {
      cancelled = true;
    };
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
