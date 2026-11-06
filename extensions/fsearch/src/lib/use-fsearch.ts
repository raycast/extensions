import { usePromise } from "@raycast/utils";
import { useEffect, useRef } from "react";
import { FSearchError, type GrepResult, type SearchResult } from "./fsearch";

/**
 * Runs one fsearch request per change of `args`, cancelling the one before.
 * Retries after indexing errors and partial content-index results.
 */
export function useFSearch<A extends unknown[], T extends SearchResult | GrepResult>(
  fetch: (signal: AbortSignal, ...args: A) => Promise<T>,
  args: A,
  execute: boolean,
) {
  const abortable = useRef<AbortController>(null);
  const result = usePromise((...a: A) => fetch(abortable.current?.signal ?? new AbortController().signal, ...a), args, {
    abortable,
    execute,
    onError: () => {},
  });

  const { data, error, isLoading, revalidate } = result;
  const indexing =
    execute &&
    (error
      ? error instanceof FSearchError && error.reason === "indexing"
      : data !== undefined && "indexing" in data && data.indexing);
  useEffect(() => {
    if (!indexing || isLoading) return;
    const timer = setTimeout(revalidate, 1000);
    return () => clearTimeout(timer);
  }, [indexing, isLoading, data, error, revalidate]);

  return { ...result, indexing };
}
