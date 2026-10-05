import { Cache } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";

/** Runs an async function on mount and on `revalidate`. The result of a superseded run is dropped. */
export function usePromise<T>(run: () => Promise<T>): { data?: T; isLoading: boolean; revalidate: () => void } {
  const [data, setData] = useState<T>();
  const [isLoading, setIsLoading] = useState(true);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let current = true;
    setIsLoading(true);
    run()
      .then((value) => current && setData(value))
      .catch(() => undefined)
      .finally(() => current && setIsLoading(false));
    return () => {
      current = false;
    };
  }, [version]);

  const revalidate = useCallback(() => setVersion((v) => v + 1), []);
  return { data, isLoading, revalidate };
}

const cache = new Cache();

/** A state value that survives between runs of the command, kept in Raycast's cache. */
export function useCachedState<T>(key: string, initial: T): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => {
    const stored = cache.get(key);
    if (stored === undefined) return initial;
    try {
      return JSON.parse(stored) as T;
    } catch {
      return initial;
    }
  });
  const set = useCallback(
    (next: T) => {
      cache.set(key, JSON.stringify(next));
      setValue(next);
    },
    [key],
  );
  return [value, set];
}
