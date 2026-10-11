import { usePromise } from "@raycast/utils";
import { useEffect, useRef } from "react";
import { FSearchError } from "./fsearch";

/**
 * Runs one fsearch request per change of `args`, cancelling the one before.
 * While the first crawl is still running, it retries every second instead
 * of failing, so results appear the moment the index is ready.
 */
export function useFSearch<A extends unknown[], T>(
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

  const indexing = result.error instanceof FSearchError && result.error.reason === "indexing";
  useEffect(() => {
    if (!indexing) return;
    const timer = setTimeout(result.revalidate, 1000);
    return () => clearTimeout(timer);
  }, [indexing, result.error]);

  return { ...result, indexing };
}
