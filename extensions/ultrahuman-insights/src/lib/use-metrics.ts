import { useCallback, useEffect, useState } from "react";
import { Memoized } from "./cache";
import { MissingTokenError, UltrahumanError } from "./ultrahuman";

interface State<T> {
  data: T | null;
  stale: boolean;
  loading: boolean;
  missingToken: boolean;
  error: Error | null;
}

export interface UseMetricsResult<T> extends State<T> {
  reload: () => Promise<void>;
}

/**
 * Wraps a cache-backed fetcher and tracks loading/stale/error/missingToken state.
 * Pass the fetcher as a memoized callback (e.g. `useCallback(() => getDay(today()), [])`).
 */
export function useMetrics<T>(
  fetcher: () => Promise<Memoized<T>>,
): UseMetricsResult<T> {
  const [state, setState] = useState<State<T>>({
    data: null,
    stale: false,
    loading: true,
    missingToken: false,
    error: null,
  });

  const reload = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, stale: false, error: null }));
    try {
      const r = await fetcher();
      setState({
        data: r.data,
        stale: r.stale,
        loading: false,
        missingToken: false,
        error: null,
      });
    } catch (e) {
      if (
        e instanceof MissingTokenError ||
        (e instanceof UltrahumanError && e.status === 401)
      ) {
        setState({
          data: null,
          stale: false,
          loading: false,
          missingToken: true,
          error: null,
        });
      } else {
        setState((s) => ({
          ...s,
          loading: false,
          error: e instanceof Error ? e : new Error(String(e)),
        }));
      }
    }
  }, [fetcher]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { ...state, reload };
}
