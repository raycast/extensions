import { useEffect, useMemo } from "react";
import { showToast, Toast } from "@raycast/api";
import { DateTime } from "luxon";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { buildAvailabilityWindows, getMonitorSla } from "@/api/betterstack-monitor-sla-api";
import { MonitorAvailabilityPeriod } from "@/domain/monitor-sla";
import { toList } from "@/common/utils/collection-utils";
import { Optional } from "@/common/utils/optional-utils";

const MONITOR_SLA_QUERY_KEY = "monitor-sla";

export function useMonitorAvailability(monitorId: string, createdAt: Optional<string>) {
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: [MONITOR_SLA_QUERY_KEY, monitorId],
    queryFn: () => fetchAvailability(monitorId, createdAt),
  });

  useEffect(() => {
    if (isError) {
      const message = error instanceof Error ? error.message : String(error);
      void showToast({ style: Toast.Style.Failure, title: "Failed to load availability", message });
    }
  }, [isError, error]);

  // Stable reference so effects keyed on the periods don't re-run every render while loading.
  const periods = useMemo(() => toList(data), [data]);

  return {
    periods,
    isLoading,
    isError,
    refresh: () => void queryClient.invalidateQueries({ queryKey: [MONITOR_SLA_QUERY_KEY, monitorId] }),
  };
}

async function fetchAvailability(monitorId: string, createdAt: Optional<string>): Promise<MonitorAvailabilityPeriod[]> {
  const windows = buildAvailabilityWindows(DateTime.now(), createdAt);

  return Promise.all(
    windows.map(async (window) => ({
      label: window.label,
      sla: await getMonitorSla(monitorId, window.range),
    })),
  );
}
