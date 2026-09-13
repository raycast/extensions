import { useEffect, useState } from "react";
import {
  CachedCandidate,
  validateRecentEntries,
} from "../lib/recent-validation";
import { Entry } from "../lib/types";
import { dataGeneration } from "../lib/storage-lock";
import { LIVE_RESULTS } from "../lib/search-limits";
import { TypeFilter } from "../lib/query";

const EMPTY: Entry[] = [];

/** Metadata runs after render and shares a bounded pool across cached sources. */
export function useCachedEntries(
  candidates: CachedCandidate[],
  query: string,
  reloadKey: number,
  limit = LIVE_RESULTS,
  signal?: AbortSignal,
  typeFilter: TypeFilter = "all",
) {
  limit = Math.min(limit, LIVE_RESULTS);
  const [checked, setChecked] = useState<{
    candidates: CachedCandidate[];
    query: string;
    reloadKey: number;
    entries: Entry[];
    pending: boolean;
    partial: boolean;
    limited: boolean;
    signal?: AbortSignal;
    typeFilter: TypeFilter;
  }>();
  useEffect(() => {
    const active = new AbortController();
    const stop = () => active.abort();
    signal?.addEventListener("abort", stop, { once: true });
    if (signal?.aborted) stop();
    const generation = dataGeneration();
    const current = () =>
      !active.signal.aborted && generation === dataGeneration();
    void validateRecentEntries(candidates, {
      query,
      typeFilter,
      limit,
      continuous: true,
      signal: active.signal,
      onProgress: (entries) => {
        if (current())
          setChecked({
            candidates,
            query,
            reloadKey,
            entries,
            pending: true,
            partial: false,
            limited: false,
            signal,
            typeFilter,
          });
      },
    }).then((result) => {
      if (current())
        setChecked({
          candidates,
          query,
          reloadKey,
          entries: result.entries,
          pending: false,
          partial: result.partial,
          limited: result.limited ?? false,
          signal,
          typeFilter,
        });
    });
    return () => {
      signal?.removeEventListener("abort", stop);
      stop();
    };
  }, [candidates, query, reloadKey, limit, signal, typeFilter]);
  const current =
    checked?.candidates === candidates &&
    checked.query === query &&
    checked.reloadKey === reloadKey &&
    checked.signal === signal &&
    checked.typeFilter === typeFilter;
  return {
    entries: current ? checked.entries : EMPTY,
    pending: candidates.length > 0 && (!current || checked.pending),
    partial: current && checked.partial,
    limited: current && checked.limited,
  };
}
