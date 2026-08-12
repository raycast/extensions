/**
 * Lazy package details for the selected row, with real cancellation (the
 * abort propagates into the winget process, so fast scrolling cannot queue
 * orphaned `winget show` runs) and a small sequential prefetch ring around the
 * selection.
 */

import { useEffect, useRef, useState } from "react";

import { showPackageDetails } from "../cli/commands";
import { type WingetPackageDetails, type WingetSource } from "../cli/types";

const PREFETCH_RADIUS = 5;

const detailsCache = new Map<string, WingetPackageDetails | null>();

function cacheKey(id: string, source: WingetSource): string {
  return `${source}|${id}`;
}

function getCachedDetails(id: string, source: WingetSource): WingetPackageDetails | null | undefined {
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
  const [details, setDetails] = useState<WingetPackageDetails | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const generationRef = useRef(0);

  useEffect(() => {
    const generation = ++generationRef.current;
    const controller = new AbortController();

    if (!selected) {
      setDetails(undefined);
      setIsLoading(false);
      return;
    }

    const cached = detailsCache.get(cacheKey(selected.id, selected.source));
    if (cached !== undefined) {
      setDetails(cached ?? undefined);
      setIsLoading(false);
    } else {
      setDetails(undefined);
      setIsLoading(true);
      showPackageDetails(selected.id, selected.source, controller.signal)
        .then((result) => {
          if (result !== null) {
            detailsCache.set(cacheKey(selected.id, selected.source), result);
          }
          if (generationRef.current === generation) {
            setDetails(result ?? undefined);
            setIsLoading(false);
          }
        })
        .catch(() => {
          if (generationRef.current === generation) {
            setIsLoading(false);
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

  return { details, isLoading };
}

export { getCachedDetails, useDetails, type DetailTarget };
