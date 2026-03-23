import { useState, useMemo } from "react";
import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useInterval } from "./use-interval";
import { fetchProcesses } from "../utils/process";
import { sortProcesses, groupProcesses } from "../utils/grouping";
import type {
  GroupMode,
  Preferences,
  Process,
  SortField,
  SortOrder,
} from "../types";

export function useProcesses(
  sortField: SortField,
  sortOrder: SortOrder,
  groupMode: GroupMode,
) {
  const [rawProcesses, setRawProcesses] = useState<Process[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const prefs = getPreferenceValues<Preferences>();
  const interval = parseInt(prefs.refreshInterval) || 0;
  const cpuThreshold = parseFloat(prefs.cpuThreshold) || 10;
  const memThreshold = parseFloat(prefs.memThreshold) || 1024;

  const refresh = () => {
    try {
      const procs = fetchProcesses();
      setRawProcesses(procs);
      setIsLoading(false);
    } catch (err) {
      showToast({
        title: "Failed to fetch processes",
        message: err instanceof Error ? err.message : "Unknown error",
        style: Toast.Style.Failure,
      });
      setIsLoading(false);
    }
  };

  useInterval(refresh, interval);

  const sorted = useMemo(
    () => sortProcesses(rawProcesses, sortField, sortOrder),
    [rawProcesses, sortField, sortOrder],
  );

  const groups = useMemo(
    () => groupProcesses(sorted, groupMode, cpuThreshold, memThreshold),
    [sorted, groupMode, cpuThreshold, memThreshold],
  );

  const removeProcess = (pid: number) => {
    setRawProcesses((prev) => prev.filter((p) => p.pid !== pid));
  };

  const removeProcesses = (pids: Set<number>) => {
    setRawProcesses((prev) => prev.filter((p) => !pids.has(p.pid)));
  };

  return {
    processes: sorted,
    groups,
    isLoading,
    refresh,
    removeProcess,
    removeProcesses,
  };
}
