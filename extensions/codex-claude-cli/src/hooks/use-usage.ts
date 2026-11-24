import { useCallback, useEffect, useRef, useState } from "react";

import { loadUsageSnapshot, refreshUsageState, type UsageSnapshot } from "../lib/usage";

export function useUsage(options?: { refreshIntervalMilliseconds?: number }) {
  const [snapshot, setSnapshot] = useState<UsageSnapshot>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error>();
  const mounted = useRef(true);
  const requestId = useRef(0);
  const refreshIntervalMilliseconds = options?.refreshIntervalMilliseconds;

  const refresh = useCallback(async (force = false) => {
    const id = ++requestId.current;
    setIsLoading(true);
    try {
      const nextSnapshot = await loadUsageSnapshot({ force });
      if (!mounted.current || id !== requestId.current) return;
      setSnapshot(nextSnapshot);
      setError(undefined);
    } catch (loadError) {
      if (!mounted.current || id !== requestId.current) return;
      const failure = loadError instanceof Error ? loadError : new Error(String(loadError));
      setError(failure);
      setSnapshot(
        (previous) =>
          previous && {
            ...previous,
            providers: {
              claude: { ...previous.providers.claude, source: "stale", error: failure.message },
              codex: { ...previous.providers.codex, source: "stale", error: failure.message },
            },
            customProviders: previous.customProviders.map((state) => ({
              ...state,
              source: "stale",
              error: failure.message,
            })),
          },
      );
    } finally {
      if (mounted.current && id === requestId.current) setIsLoading(false);
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

  useEffect(() => {
    // Age the visible readout even when no network refresh is due.
    const timer = setInterval(
      () =>
        setSnapshot(
          (previous) =>
            previous && {
              ...previous,
              providers: {
                claude: refreshUsageState(previous.providers.claude),
                codex: refreshUsageState(previous.providers.codex),
              },
              customProviders: previous.customProviders.map((state) => refreshUsageState(state)),
            },
        ),
      30_000,
    );
    return () => clearInterval(timer);
  }, []);

  return { snapshot, isLoading, error, refresh };
}
