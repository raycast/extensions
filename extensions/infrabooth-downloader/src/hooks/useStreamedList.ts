import { useCachedState } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";
import type { BatchListener } from "../lib/api";
import { handleError } from "../lib/feedback";

type StreamLoader<T> = (onBatch: BatchListener<T>, signal: AbortSignal) => Promise<T[]>;

interface StreamedListOptions {
  enabled?: boolean;
  appendToCache?: boolean;
}

export function useStreamedList<T>(
  cacheKey: string,
  load: StreamLoader<T>,
  errorTitle: string,
  { enabled = true, appendToCache = false }: StreamedListOptions = {},
) {
  const [items, setItems] = useCachedState<T[]>(cacheKey, []);
  const [isLoading, setIsLoading] = useState(enabled);
  const latest = useRef({ items, load, errorTitle, appendToCache, setItems });

  useEffect(() => {
    latest.current = { items, load, errorTitle, appendToCache, setItems };
  });

  useEffect(() => {
    if (!enabled) return;
    const { items: cached, load, errorTitle, appendToCache, setItems } = latest.current;
    const controller = new AbortController();
    const hadCache = cached.length > 0;
    let streamed: T[] = appendToCache ? cached : [];
    setIsLoading(true);

    // With cached rows on screen, wait for the full list instead of shrinking to a partial first batch.
    const onBatch: BatchListener<T> = (batch) => {
      if ((hadCache && !appendToCache) || controller.signal.aborted) return;
      streamed = [...streamed, ...batch];
      setItems(streamed);
    };

    load(onBatch, controller.signal)
      .then((all) => {
        if (!controller.signal.aborted) setItems(all);
      })
      .catch((error) => {
        if (!controller.signal.aborted) void handleError(error, errorTitle);
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [cacheKey, enabled]);

  return { items, isLoading };
}
