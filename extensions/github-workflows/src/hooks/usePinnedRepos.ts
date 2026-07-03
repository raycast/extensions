import { Cache } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";

/** Shared across both commands so pinning/reordering in one is reflected in the other. */
const STORAGE_KEY = "pinned-repo-paths";

// `Cache` (unlike `useLocalStorage`) reads synchronously from disk, so the pinned section can be
// rendered in its final position on the very first render instead of popping in after a load.
const cache = new Cache();

function readPinnedPaths(): string[] {
  const raw = cache.get(STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Manages an ordered list of pinned repo paths, persisted to disk via `Cache`.
 * Order in the stored array determines display order among pinned repos.
 */
export function usePinnedRepos() {
  const [paths, setPaths] = useState<string[]>(readPinnedPaths);

  // Keep in sync if another command instance (or window) changes the pinned list.
  useEffect(
    () =>
      cache.subscribe((key) => {
        if (key === STORAGE_KEY) setPaths(readPinnedPaths());
      }),
    [],
  );

  function persist(next: string[]) {
    setPaths(next);
    cache.set(STORAGE_KEY, JSON.stringify(next));
  }

  const isPinned = useCallback((repoPath: string): boolean => paths.includes(repoPath), [paths]);

  const togglePin = useCallback(
    (repoPath: string) => {
      if (paths.includes(repoPath)) {
        persist(paths.filter((p) => p !== repoPath));
      } else {
        persist([...paths, repoPath]);
      }
    },
    [paths],
  );

  const moveUp = useCallback(
    (repoPath: string) => {
      const index = paths.indexOf(repoPath);
      if (index <= 0) return;

      const next = [...paths];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      persist(next);
    },
    [paths],
  );

  const moveDown = useCallback(
    (repoPath: string) => {
      const index = paths.indexOf(repoPath);
      if (index === -1 || index >= paths.length - 1) return;

      const next = [...paths];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      persist(next);
    },
    [paths],
  );

  /** Drops stored paths for repos that no longer exist/match, to avoid unbounded growth over time. */
  const pruneToExisting = useCallback(
    (existingPaths: Set<string>) => {
      const filtered = paths.filter((p) => existingPaths.has(p));
      if (filtered.length !== paths.length) {
        persist(filtered);
      }
    },
    [paths],
  );

  return { pinnedPaths: paths, isPinned, togglePin, moveUp, moveDown, pruneToExisting };
}
