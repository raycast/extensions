import { useCallback, useEffect, useRef } from "react";
import { useCachedState, usePromise } from "@raycast/utils";
import {
  CachedReport,
  getReportRefreshDelay,
  getReportRefreshInterval,
  REPORT_CACHE_NAMESPACE,
  ReportKind,
} from "../utils/usage-report";

export function useCCUsageReport<T>(kind: ReportKind, load: (force?: boolean) => Promise<T>) {
  // All consumers subscribe to the same persistent cache entry. A refresh from
  // any consumer updates the others, and changing visibility retains the cache.
  const [cached] = useCachedState<CachedReport<T> | undefined>(kind, undefined, {
    cacheNamespace: REPORT_CACHE_NAMESPACE,
  });
  const forceNext = useRef(false);
  const invoke = useCallback(() => {
    const force = forceNext.current;
    forceNext.current = false;
    return load(force);
  }, [load]);
  const result = usePromise(invoke, [], {
    failureToastOptions: {
      title: "Failed to fetch usage data",
      primaryAction: {
        title: "Retry",
        onAction: (toast) => {
          void toast.hide();
          void revalidate();
        },
      },
    },
  });
  const revalidate = useCallback(() => {
    forceNext.current = true;
    return result.revalidate();
  }, [result.revalidate]);

  useEffect(() => {
    // Only mounted (visible) consumers poll. Fresh cached results wait until
    // their expiry; failed requests back off for one complete refresh interval.
    if (result.isLoading) return;
    const delay = result.error ? getReportRefreshInterval() : getReportRefreshDelay(kind);
    const id = setTimeout(() => void result.revalidate(), delay);
    return () => clearTimeout(id);
  }, [kind, cached, result.isLoading, result.error, result.revalidate]);

  return { ...result, data: cached?.data ?? result.data, revalidate };
}
