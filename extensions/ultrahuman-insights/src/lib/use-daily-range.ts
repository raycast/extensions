import { useCallback, useMemo } from "react";
import { getRange, clearRange } from "./cache";
import { DailyMetricsRange } from "./types";
import { lastNDaysEpoch, todayDateKey } from "./format";
import { useMetrics } from "./use-metrics";
import { sortByDate } from "./daily-metrics";

export function useDailyRange(days = 7) {
  const dateKey = todayDateKey();
  const range = useMemo(() => lastNDaysEpoch(days), [dateKey, days]);
  const fetcher = useCallback(() => getRange(range.start, range.end), [range]);
  const { data, stale, loading, missingToken, error, reload } = useMetrics<DailyMetricsRange>(fetcher);

  const refresh = useCallback(async () => {
    clearRange(range.start, range.end);
    await reload();
  }, [range, reload]);

  const sorted = useMemo(() => (data ? sortByDate(data) : []), [data]);

  return { data, stale, loading, missingToken, error, refresh, sorted, range };
}
