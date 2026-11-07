import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { defaultRoots, dlog, loadIndex, makeSearchable, rebuildRoots, Searchable } from "./folder-index";
import { Prefs } from "./prefs";

export interface IndexProgress {
  total: number;
  scanning: string[];
}

/** Loads the cached folder index and refreshes stale roots in the background while the command is open. */
export function useFolderIndex(prefs: Prefs) {
  const roots = useMemo(() => (prefs.roots.length ? prefs.roots : defaultRoots()), [prefs.roots]);
  const [items, setItems] = useState<Searchable[]>([]);
  const [isLoaded, setLoaded] = useState(false);
  const [progress, setProgress] = useState<IndexProgress | undefined>();
  const mounted = useRef(true);
  const lastReload = useRef(0);

  const reload = useCallback(async () => {
    const state = await loadIndex(roots, prefs.indexDepth, prefs.indexMaxAgeMs);
    if (mounted.current) {
      setItems(makeSearchable(state.paths));
      setLoaded(true);
    }
    return state;
  }, [roots, prefs.indexDepth, prefs.indexMaxAgeMs]);

  const rebuild = useCallback(
    async (which: string[]) => {
      if (!which.length) return;
      setProgress({ total: 0, scanning: which });
      await rebuildRoots(which, prefs.indexDepth, (info) => {
        if (!mounted.current) return;
        setProgress(info);
        // Make newly found folders searchable while the scan continues (at most every 3 s).
        if (Date.now() - lastReload.current > 3000) {
          lastReload.current = Date.now();
          void reload();
        }
      });
      if (mounted.current) {
        setProgress(undefined);
        await reload();
      }
    },
    [prefs.indexDepth, reload],
  );

  useEffect(() => {
    mounted.current = true;
    reload()
      .then((state) => {
        dlog(`open: indexed=${state.paths.length} stale=${state.stale.join(" | ") || "none"}`);
        if (state.stale.length) void rebuild(state.stale);
      })
      .catch((error) => dlog(`load error: ${(error as Error).stack ?? error}`));
    return () => {
      mounted.current = false;
    };
  }, [reload, rebuild]);

  return {
    items,
    isLoaded,
    progress,
    rebuildAll: () => rebuild(roots),
  };
}
