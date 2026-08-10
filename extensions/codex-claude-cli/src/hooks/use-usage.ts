import { useCallback, useEffect, useRef, useState } from "react";

import { loadUsageSnapshot, type UsageSnapshot } from "../lib/usage";

export function useUsage(options?: { refreshIntervalMilliseconds?: number }) {
  const [snapshot, setSnapshot] = useState<UsageSnapshot>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error>();
  const mounted = useRef(true);
  const refreshIntervalMilliseconds = options?.refreshIntervalMilliseconds;

  const refresh = useCallback(async (force = false) => {
    setIsLoading(true);
    try {
      const nextSnapshot = await loadUsageSnapshot({ force });
      if (!mounted.current) return;
      setSnapshot(nextSnapshot);
      setError(undefined);
    } catch (loadError) {
      if (!mounted.current) return;
      setError(loadError instanceof Error ? loadError : new Error(String(loadError)));
    } finally {
      if (mounted.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    void refresh();
    return () => {
      mounted.current = false;
    };
  }, [refresh]);

  useEffect(() => {
    if (!refreshIntervalMilliseconds) return;
    const interval = setInterval(() => void refresh(), refreshIntervalMilliseconds);
    return () => clearInterval(interval);
  }, [refresh, refreshIntervalMilliseconds]);

  return { snapshot, isLoading, error, refresh };
}
