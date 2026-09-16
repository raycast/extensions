import { Dispatch, SetStateAction, useCallback, useEffect } from "react";
import { dataGeneration } from "../lib/storage-lock";
import { recordAbbreviation, recordSearch } from "../lib/store";

/** How long a query must sit unchanged before it is remembered as history. */
const HISTORY_SETTLE_MS = 1500;

/**
 * Remembers what was searched for, and what it was searched for.
 *
 * Two routes into the same history: a settled query is recorded on its own, and
 * a query the user acted on is recorded immediately, together with the target
 * it led to. Both discard their result if the store was reset while they ran.
 */
export function useSearchHistoryRecording(state: {
  query: string;
  minQuery: number;
  /** Truthy while the path bar owns the query, which is never history. */
  pathQuery: unknown;
  normalizedQuery: string;
  setHistory: Dispatch<SetStateAction<string[]>>;
  setAbbreviations: Dispatch<
    SetStateAction<Record<string, Record<string, number>>>
  >;
}): (target?: string, storageGeneration?: string) => Promise<void> {
  const { query, minQuery, pathQuery, normalizedQuery } = state;
  const { setHistory, setAbbreviations } = state;

  /** Records a query and optionally learns its selected target. */
  const commitSearch = useCallback(
    async (target?: string, storageGeneration = dataGeneration()) => {
      if (query === "") return;
      const history = await recordSearch(query, storageGeneration);
      if (storageGeneration !== dataGeneration()) return;
      setHistory(history);
      if (target !== undefined) {
        setAbbreviations(
          await recordAbbreviation(normalizedQuery, target, storageGeneration),
        );
      }
    },
    [query, normalizedQuery, setHistory, setAbbreviations],
  );

  // Record settled queries without storing every typed prefix.
  useEffect(() => {
    if (query.length < minQuery || pathQuery) return;
    const storageGeneration = dataGeneration();
    let cancelled = false;
    const timer = setTimeout(() => {
      void recordSearch(query, storageGeneration)
        .then((history) => {
          if (!cancelled && storageGeneration === dataGeneration())
            setHistory(history);
        })
        .catch(() => {
          /* Background history is best-effort, including during deletion. */
        });
    }, HISTORY_SETTLE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, minQuery, pathQuery, setHistory]);

  return commitSearch;
}
