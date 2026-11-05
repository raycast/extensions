import { useCallback, useEffect, useRef, useState } from "react";
import { isCancelled } from "../lib/errors";

export function useResource<T>(load: (signal: AbortSignal) => Promise<T>) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<unknown>();
  const [isLoading, setLoading] = useState(true);
  const active = useRef<{ controller: AbortController; done: Promise<void> } | undefined>(undefined);
  const refresh = useCallback(async () => {
    const previous = active.current;
    previous?.controller.abort();
    const controller = new AbortController();
    setLoading(true);
    setError(undefined);
    // A failed refresh must not leave old text or a screenshot looking current.
    setData(undefined);
    const done = (async () => {
      try {
        // OCR refresh must finish releasing its previous lease before acquiring another.
        await previous?.done;
        controller.signal.throwIfAborted();
        const result = await load(controller.signal);
        if (!controller.signal.aborted) setData(result);
      } catch (failure) {
        if (!controller.signal.aborted && !isCancelled(failure)) setError(failure);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    active.current = { controller, done };
    await done;
  }, [load]);
  useEffect(() => {
    void refresh();
    return () => active.current?.controller.abort();
  }, [refresh]);
  return { data, error, isLoading, refresh };
}
