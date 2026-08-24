import { showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { readCachedIndex, rebuildIndex, reconcilePath, refreshRepoEntries } from "../lib/cache";
import { getConfig } from "../lib/config";
import type { RepoIndex } from "../lib/types";
import { errorMessage } from "../lib/util";

export interface RepoIndexController {
  index: RepoIndex | undefined;
  isLoading: boolean;
  scanError: string | undefined;
  /** Full rescan. `recomputeSizes` re-runs du (slower); otherwise cached sizes are reused. */
  refresh: (options?: { recomputeSizes?: boolean }) => Promise<void>;
  /** Re-inspect one path after an action changed it (fetch/pull/remotes/offload/trash/…). */
  reconcile: (fullPath: string) => Promise<void>;
  /** Re-inspect several repo entries, keeping their sizes. */
  refreshEntries: (fullPaths: string[]) => Promise<void>;
  /** Apply an externally produced index (e.g. after a bulk operation already wrote the cache). */
  setIndex: (index: RepoIndex) => void;
}

/**
 * Cached repository index shared by all commands: renders instantly from the
 * Raycast Cache, then revalidates with a background rescan on mount.
 */
export function useRepoIndex(): RepoIndexController {
  const config = useRef(getConfig()).current;
  const [index, setIndex] = useState<RepoIndex | undefined>(() => readCachedIndex(config.root));
  const [isLoading, setIsLoading] = useState(true);
  const [scanError, setScanError] = useState<string>();
  const indexRef = useRef(index);
  indexRef.current = index;

  const refresh = useCallback(
    async (options: { recomputeSizes?: boolean } = {}) => {
      setIsLoading(true);
      try {
        const fresh = await rebuildIndex(config.root, config.maxDepth, config.defaultProtocol, {
          reuseSizesFrom: options.recomputeSizes ? undefined : indexRef.current,
        });
        setIndex(fresh);
        setScanError(undefined);
      } catch (error) {
        setScanError(errorMessage(error));
        if (indexRef.current) {
          await showToast({ style: Toast.Style.Failure, title: "Rescan failed", message: errorMessage(error) });
        }
      } finally {
        setIsLoading(false);
      }
    },
    [config],
  );

  const reconcile = useCallback(
    async (fullPath: string) => {
      if (!indexRef.current) return;
      setIndex(await reconcilePath(indexRef.current, fullPath, config.defaultProtocol));
    },
    [config],
  );

  const refreshEntries = useCallback(
    async (fullPaths: string[]) => {
      if (!indexRef.current) return;
      setIndex(await refreshRepoEntries(indexRef.current, fullPaths, config.defaultProtocol));
    },
    [config],
  );

  useEffect(() => {
    // Sizes are recomputed only when the cache is empty; manual refresh can force it.
    refresh({ recomputeSizes: readCachedIndex(config.root) === undefined });
  }, [refresh, config]);

  return { index, isLoading, scanError, refresh, reconcile, refreshEntries, setIndex };
}
