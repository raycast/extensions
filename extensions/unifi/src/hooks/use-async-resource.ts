import { useCallback, useEffect, useRef, useState } from "react";

export function useAsyncResource<T>(load: (signal: AbortSignal) => Promise<T>) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<Error>();
  const [isLoading, setIsLoading] = useState(true);
  const generation = useRef(0);
  const activeController = useRef<AbortController | undefined>(undefined);

  const abort = useCallback(() => activeController.current?.abort(), []);

  const revalidate = useCallback(async () => {
    abort();
    const currentGeneration = ++generation.current;
    const controller = new AbortController();
    activeController.current = controller;
    setIsLoading(true);
    setError(undefined);

    try {
      const result = await load(controller.signal);
      if (generation.current === currentGeneration) setData(result);
    } catch (caught) {
      if (controller.signal.aborted) return;
      if (generation.current === currentGeneration) {
        setError(caught instanceof Error ? caught : new Error("UniFi request failed."));
      }
    } finally {
      if (generation.current === currentGeneration) setIsLoading(false);
    }
  }, [abort, load]);

  useEffect(() => {
    void revalidate();
    return abort;
  }, [abort, revalidate]);

  return { data, error, isLoading, revalidate };
}
