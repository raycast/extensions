import { usePromise } from "@raycast/utils";
import { useRef } from "react";
import { isCancelled } from "../lib/errors";

export function useResource<T>(load: (signal: AbortSignal) => Promise<T>) {
  const abortable = useRef<AbortController>(null);
  const settled = useRef<Promise<void>>(undefined);
  const { data, error, isLoading, revalidate } = usePromise(
    async (loadResource: (signal: AbortSignal) => Promise<T>) => {
      const signal = abortable.current?.signal ?? AbortSignal.abort();
      const previous = settled.current;
      const request = (async () => {
        try {
          // Aborting OCR still leaves its lease cleanup in flight.
          await previous;
          signal.throwIfAborted();
          return await loadResource(signal);
        } catch (failure) {
          if (!isCancelled(failure)) throw failure;
        }
      })();
      settled.current = request.then(
        () => undefined,
        () => undefined,
      );
      return request;
    },
    [load],
    {
      abortable,
      onError() {
        // The view renders ErrorView with recovery actions.
      },
    },
  );

  // Do not display old screen contents or errors during a refresh.
  return { data: isLoading ? undefined : data, error: isLoading ? undefined : error, isLoading, refresh: revalidate };
}
