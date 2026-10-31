import { useEffect, useRef, useState } from "react";

export interface AsyncState<T> {
  data?: T;
  error?: Error;
  isLoading: boolean;
  revalidate: () => void;
}

/** Tiny data-fetching hook: keeps the previous data while reloading. */
export function useAsync<T>(
  loader: () => Promise<T>,
  deps: unknown[] = [],
): AsyncState<T> {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<Error>();
  const [isLoading, setIsLoading] = useState(true);
  const [tick, setTick] = useState(0);

  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    loaderRef
      .current()
      .then((result) => {
        if (!active) return;
        setData(result);
        setError(undefined);
      })
      .catch((caught: unknown) => {
        if (!active) return;
        setError(caught instanceof Error ? caught : new Error(String(caught)));
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [...deps, tick]);

  return {
    data,
    error,
    isLoading,
    revalidate: () => setTick((value) => value + 1),
  };
}
