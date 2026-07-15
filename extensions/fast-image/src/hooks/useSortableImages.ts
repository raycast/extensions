import { useCallback, useEffect, useMemo, useState } from "react";
import { loadSortMode, saveSortMode } from "../lib/sortPreference";
import { sortImages } from "../lib/sort";
import { loadUsageStats, pruneUsageStats, recordUsage } from "../lib/usageStats";
import { ImageFile, SortMode, UsageStats } from "../types";

export function useSortableImages(images: ImageFile[]) {
  const [sortMode, setSortModeState] = useState<SortMode>("name-asc");
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
    if (images.length === 0) return;
    const validPaths = new Set(images.map((image) => image.path));
    pruneUsageStats(validPaths).then(setUsage);
  }, [images]);

  const setSortMode = useCallback((mode: SortMode) => {
    setSortModeState(mode);
    saveSortMode(mode);
  }, []);

  const markUsed = useCallback(async (path: string) => {
    const stats = await recordUsage(path);
    setUsage(stats);
  }, []);

  const sorted = useMemo(() => sortImages(images, sortMode, usage), [images, sortMode, usage]);

  return { sorted, sortMode, setSortMode, markUsed, isLoaded };
}
