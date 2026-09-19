import { usePromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import { createClient } from "../api/client";
import { getConfig } from "../preferences";
import { readIndex, writeIndex } from "./cache";
import { loadIndex, type SearchIndex } from "./loadIndex";

/**
 * Stale-while-revalidate: the cached index is returned synchronously so typing works immediately,
 * while a full refetch runs in parallel and replaces it on arrival.
 */
export function useSearchIndex() {
  const cached = useMemo(() => readIndex(), []);
  const [index, setIndex] = useState<SearchIndex | null>(cached);

  const { isLoading, error, revalidate } = usePromise(async () => {
    const fresh = await loadIndex(createClient(getConfig()));
    writeIndex(fresh);
    setIndex(fresh);
    return fresh;
  }, []);

  return {
    index,
    // Only block the UI when there is nothing to show at all.
    isLoading: isLoading && index === null,
    isStale: isLoading && index !== null,
    error,
    revalidate,
  };
}
