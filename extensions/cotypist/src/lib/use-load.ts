import { useCallback, useEffect, useRef, useState } from "react";

export function useLoad<T>(loader: () => Promise<T>, key: string) {
  const latest = useRef(loader);
  latest.current = loader;
  const generation = useRef(0);
  const [data, setData] = useState<T>();
  const [error, setError] = useState<string>();
  const [isLoading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    const current = ++generation.current;
    setLoading(true);
    setError(undefined);
    try {
      const value = await latest.current();
      if (generation.current === current) setData(value);
    } catch (error) {
      if (generation.current === current) {
        setData(undefined);
        setError(
          error instanceof Error
            ? error.message
            : "Could not load your courses.",
        );
      }
    } finally {
      if (generation.current === current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    setData(undefined);
    void refresh();
    return () => {
      generation.current++;
    };
  }, [key, refresh]);
  return { data, error, isLoading, refresh };
}
