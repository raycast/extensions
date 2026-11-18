import { useEffect, useState } from "react";
import {
  CACHED_METADATA_BUDGET_MS,
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
  signal?: AbortSignal,
  typeFilter: TypeFilter = "all",
) {
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
    // One publication per query. Validating cached paths used to publish every
    // 100ms, which reordered the list while the user was reading it. The wait
    // is bounded by the validator's own deadline, and what it did not reach is
    // reported as partial.
    void validateRecentEntries(candidates, {
      query,
      typeFilter,
      limit: LIVE_RESULTS,
      budgetMs: CACHED_METADATA_BUDGET_MS,
      signal: active.signal,
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
  }, [candidates, query, reloadKey, signal, typeFilter]);
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
