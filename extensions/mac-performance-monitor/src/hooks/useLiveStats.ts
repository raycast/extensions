/**
 * The one React hook every command uses. It polls the database and hands the views
 * everything they draw: the latest snapshot, the chart history for the selected
 * range, the list of running apps, and whether the MPM app is running. It also
 * reads the app's recording settings to decide which chart ranges are available.
 */

import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  getActiveProcesses,
  getLatestSnapshot,
  getProcessTree,
  getSystemHistory,
  groupProcesses,
  sortApps,
  SortMetric,
} from "../data/queries";
import { readRecordingSettings, RecordingSettings } from "../data/appSettings";
import { rangeSeconds, rangesWithin, startingRange } from "../data/ranges";
import { AppGroup, GlobalPreferences, SystemHistoryPoint, SystemSnapshot, TimeRange } from "../data/types";

/** Converts the "Live Refresh Cadence" preference into milliseconds. */
export function cadenceToMs(cadence: string | undefined): number {
  switch (cadence) {
    case "1s":
      return 1000;
    case "5s":
      return 5000;
    default:
      return 2000;
  }
}

interface UseLiveStatsOptions {
  /** Metric used to sort the applications list. */
  sortMetric: SortMetric;
}

export function useLiveStats(options: UseLiveStatsOptions) {
  const prefs = getPreferenceValues<GlobalPreferences>();
  const cadenceMs = cadenceToMs(prefs.refreshCadence);
  const sortMetric = options.sortMetric;

  // The app's settings are read once, when the view opens.
  const settingsRef = useRef<RecordingSettings | null>(null);
  if (settingsRef.current === null) {
    settingsRef.current = readRecordingSettings();
  }
  const settings = settingsRef.current;
  const availableRanges = rangesWithin(settings.rawRetentionSeconds);

  let preferredRange: TimeRange = "15m";
  if (prefs.defaultRange !== undefined) {
    preferredRange = prefs.defaultRange;
  }
  const [range, setRange] = useState<TimeRange>(startingRange(preferredRange, availableRanges));
  const [snapshot, setSnapshot] = useState<SystemSnapshot | null>(null);
  const [history, setHistory] = useState<SystemHistoryPoint[]>([]);
  const [apps, setApps] = useState<AppGroup[]>([]);
  const [isAppRunning, setIsAppRunning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Set to false when the view closes, so a late response does not update a dead view.
  const isMountedRef = useRef(true);
  // Prevents two fetches from running at the same time.
  const isFetchingRef = useRef(false);

  // One refresh tick. A new instance is made when the range or sort metric changes,
  // which also restarts the polling effect below.
  const fetchStats = useCallback(async () => {
    if (isFetchingRef.current) {
      return;
    }
    isFetchingRef.current = true;

    try {
      // All four run at the same time; we wait for all of them.
      const [snap, hist, processes, tree] = await Promise.all([
        getLatestSnapshot(),
        getSystemHistory(rangeSeconds(range), settings.rawIntervalSeconds),
        getActiveProcesses(),
        getProcessTree(),
      ]);
      if (!isMountedRef.current) {
        return;
      }

      const grouped = sortApps(groupProcesses(processes, tree), sortMetric);

      setIsAppRunning(tree.isMonitorRunning);
      setSnapshot(snap);
      setHistory(hist);
      setApps(grouped);
    } catch (error) {
      if (isMountedRef.current) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Could not read performance data",
          message: String(error),
        });
      }
    } finally {
      isFetchingRef.current = false;
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [range, sortMetric, settings]);

  // Start polling. Each tick schedules the next one only after it finishes, so
  // a slow tick can never overlap the next.
  useEffect(() => {
    isMountedRef.current = true;
    let isCancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const tick = async () => {
      await fetchStats();
      if (!isCancelled) {
        timer = setTimeout(tick, cadenceMs);
      }
    };
    tick();

    return () => {
      isCancelled = true;
      isMountedRef.current = false;
      if (timer !== undefined) {
        clearTimeout(timer);
      }
    };
  }, [fetchStats, cadenceMs]);

  return {
    snapshot,
    history,
    range,
    setRange,
    availableRanges,
    apps,
    isAppRunning,
    isLoading,
    refresh: fetchStats,
  };
}
