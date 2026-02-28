import { useEffect, useState } from "react";

import { getCompat, readCachedCompat } from "@/lib/compat";
import type { CompatMatch, Result } from "@/types";

type CompatState = Record<string, CompatMatch | null>;

const PREFETCH_ITEMS = 10;
const PREFETCH_CONCURRENCY = 4;

function mergeCompatState(
  previous: CompatState,
  entries: Array<{ path: string; compat: CompatMatch | null }>,
): CompatState {
  if (!entries.length) {
    return previous;
  }

  const next = { ...previous };

  for (const entry of entries) {
    next[entry.path] = entry.compat;
  }

  return next;
}

export function useCompatPrefetch(results: Result[], selectedResult: Result | undefined): CompatState {
  const [compatByPath, setCompatByPath] = useState<CompatState>({});

  useEffect(() => {
    if (!results.length) {
      return;
    }

    let cancelled = false;
    const visible = results.slice(0, PREFETCH_ITEMS);
    const immediate: Array<{ path: string; compat: CompatMatch | null }> = [];
    const pending: string[] = [];

    for (const item of visible) {
      if (compatByPath[item.path] !== undefined) {
        continue;
      }

      const cached = readCachedCompat(item.path);
      if (cached !== undefined) {
        immediate.push({ path: item.path, compat: cached });
      } else {
        pending.push(item.path);
      }
    }

    if (immediate.length) {
      setCompatByPath((previous) => mergeCompatState(previous, immediate));
    }

    if (!pending.length) {
      return;
    }

    const run = async () => {
      for (let index = 0; index < pending.length; index += PREFETCH_CONCURRENCY) {
        const batch = pending.slice(index, index + PREFETCH_CONCURRENCY);
        const resolved = await Promise.all(
          batch.map(async (path) => {
            const compat = await getCompat(path);
            return { path, compat: compat ?? null };
          }),
        );

        if (cancelled) {
          return;
        }

        setCompatByPath((previous) => mergeCompatState(previous, resolved));
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [compatByPath, results]);

  useEffect(() => {
    if (!selectedResult) {
      return;
    }

    const path = selectedResult.path;
    if (compatByPath[path] !== undefined) {
      return;
    }

    let cancelled = false;

    const run = async () => {
      const compat = await getCompat(path);

      if (cancelled) {
        return;
      }

      setCompatByPath((previous) => ({
        ...previous,
        [path]: compat ?? null,
      }));
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [compatByPath, selectedResult]);

  return compatByPath;
}
