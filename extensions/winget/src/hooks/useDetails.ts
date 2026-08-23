/**
 * Lazy package details for the selected row, with real cancellation (the
 * abort propagates into the winget process, so fast scrolling cannot queue
 * orphaned `winget show` runs) and a small sequential prefetch ring around the
 * selection.
 *
 * Cache hits resolve synchronously during render and fetch results are keyed
 * to the row they were fetched for — a selection change can never paint one
 * row with another row's details, not even for a single frame.
 */

import { useEffect, useState } from "react";

import { showPackageDetails } from "../cli/commands";
import { type WingetPackageDetails, type WingetSource } from "../cli/types";

const PREFETCH_RADIUS = 5;

const detailsCache = new Map<string, WingetPackageDetails>();

function cacheKey(id: string, source: WingetSource): string {
  return `${source}|${id}`;
}

function getCachedDetails(id: string, source: WingetSource): WingetPackageDetails | undefined {
  return detailsCache.get(cacheKey(id, source));
}

interface DetailTarget {
  id: string;
  source: WingetSource;
}

interface UseDetailsResult {
  details: WingetPackageDetails | undefined;
  isLoading: boolean;
}

function useDetails(selected: DetailTarget | undefined, neighbors: DetailTarget[] = []): UseDetailsResult {
  // Fetch outcomes the cache cannot answer (winget returned nothing, or the
  // fetch failed); keyed so a completion for a previous selection is ignored.
  const [fetched, setFetched] = useState<{ key: string; details?: WingetPackageDetails }>();

  const key = selected ? cacheKey(selected.id, selected.source) : null;
  const cached = key ? detailsCache.get(key) : undefined;

  useEffect(() => {
    if (!selected) {
      return;
    }
    const controller = new AbortController();
    const targetKey = cacheKey(selected.id, selected.source);

    if (!detailsCache.has(targetKey)) {
      showPackageDetails(selected.id, selected.source, controller.signal)
        .then((result) => {
          if (result !== null) {
            detailsCache.set(targetKey, result);
          }
          if (!controller.signal.aborted) {
            setFetched({ key: targetKey, details: result ?? undefined });
          }
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            setFetched({ key: targetKey });
          }
        });
    }

    // Prefetch ring: sequential, abortable, cache-only effects.
    (async () => {
      const ring = neighbors.slice(0, PREFETCH_RADIUS * 2);
      for (const neighbor of ring) {
        if (controller.signal.aborted) {
          return;
        }
        if (detailsCache.has(cacheKey(neighbor.id, neighbor.source))) {
          continue;
        }
        try {
          const result = await showPackageDetails(neighbor.id, neighbor.source, controller.signal);
          if (result !== null) {
            detailsCache.set(cacheKey(neighbor.id, neighbor.source), result);
          }
        } catch {
          return; // aborted or failed: stop prefetching quietly
        }
      }
    })();

    return () => {
      controller.abort();
    };
  }, [selected?.id, selected?.source]);

  return {
    details: cached ?? (fetched?.key === key ? fetched.details : undefined),
    isLoading: key !== null && cached === undefined && fetched?.key !== key,
  };
}

export { getCachedDetails, useDetails, type DetailTarget };
