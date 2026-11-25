/**
 * The one React hook every command uses. It polls the database and hands the views
 * everything they draw: the latest snapshot, the chart history for the selected
 * range, the list of running apps, whether the MPM app is running, and whether the
 * installed app is too old to read.
 * It also reads the app's recording settings to decide which chart ranges are available.
 */

import { getPreferenceValues } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useRef, useState } from "react";
import { readRecordingSettings, RecordingSettings } from "../data/appSettings";
import { isTooOld, readInstalledVersion } from "../data/appVersion";
import {
  getActiveProcesses,
  getLatestSnapshot,
  getProcessTable,
  getSystemHistory,
  groupProcesses,
  sortApps,
  SortMetric,
} from "../data/queries";
import { rangeSeconds, rangesWithin, startingRange } from "../data/ranges";
import { usePolling } from "./usePolling";
import { AppGroup, SystemHistoryPoint, SystemSnapshot, TimeRange } from "../data/types";

/** Converts the "Live Refresh Cadence" preference into milliseconds. */
export function cadenceToMs(cadence: Preferences["refreshCadence"]): number {
  switch (cadence) {
    case "1s":
      return 1000;
    case "2s":
      return 2000;
    case "5s":
      return 5000;
  }
}

/** Everything one refresh produces. */
interface LiveStats {
  outdatedVersion: string | null; // The installed app version when it is too old for the extension
  isAppRunning: boolean;
  snapshot: SystemSnapshot | null;
  history: SystemHistoryPoint[];
  apps: AppGroup[];
}

/**
 * One refresh. The database is only read while a new enough app is running. With an
 * older release the views show the "update" notice, and when the app is not running
 * there is nothing new to show, so the views show the "not running" notice.
 */
async function loadStats(
  windowSeconds: number,
  rawIntervalSeconds: number,
  sortMetric: SortMetric,
): Promise<LiveStats> {
  const installedVersion = await readInstalledVersion();
  if (installedVersion !== null && isTooOld(installedVersion)) {
    return { outdatedVersion: installedVersion, isAppRunning: false, snapshot: null, history: [], apps: [] };
  }

  const table = await getProcessTable();
  if (!table.isMonitorRunning) {
    return { outdatedVersion: null, isAppRunning: false, snapshot: null, history: [], apps: [] };
  }

  const snapshot = await getLatestSnapshot();
  const history = await getSystemHistory(windowSeconds, rawIntervalSeconds);
  const processes = await getActiveProcesses();
  const apps = sortApps(groupProcesses(processes, table), sortMetric);
  return { outdatedVersion: null, isAppRunning: true, snapshot: snapshot, history: history, apps: apps };
}

interface UseLiveStatsOptions {
  /** Metric used to sort the applications list. */
  sortMetric: SortMetric;
}

export function useLiveStats(options: UseLiveStatsOptions) {
  const prefs = getPreferenceValues<Preferences>();
  const cadenceMs = cadenceToMs(prefs.refreshCadence);

  // The app's settings are read once, when the view opens.
  const settingsRef = useRef<RecordingSettings | null>(null);
  if (settingsRef.current === null) {
    settingsRef.current = readRecordingSettings();
  }
  const settings = settingsRef.current;
  const availableRanges = rangesWithin(settings.rawRetentionSeconds);
  const [range, setRange] = useState<TimeRange>(startingRange(prefs.defaultRange, availableRanges));

  // usePromise runs loadStats again whenever one of its arguments changes, keeps only
  // the newest result, and shows a failure toast (with Retry) when a refresh fails.
  const { data, error, revalidate } = usePromise(
    loadStats,
    [rangeSeconds(range), settings.rawIntervalSeconds, options.sortMetric],
    { failureToastOptions: { title: "Could not read performance data" } },
  );

  // Refresh on the cadence from the preferences while the view is open.
  usePolling(revalidate, cadenceMs);

  // usePromise sets its own isLoading on every refresh; the views only want to know
  // whether the first result (data or an error) has arrived yet.
  let isLoading = false;
  if (data === undefined && error === undefined) {
    isLoading = true;
  }

  let outdatedVersion: string | null = null;
  let isAppRunning = false;
  let snapshot: SystemSnapshot | null = null;
  let history: SystemHistoryPoint[] = [];
  let apps: AppGroup[] = [];
  if (data !== undefined) {
    outdatedVersion = data.outdatedVersion;
    isAppRunning = data.isAppRunning;
    snapshot = data.snapshot;
    history = data.history;
    apps = data.apps;
  }

  return {
    snapshot,
    history,
    range,
    setRange,
    availableRanges,
    apps,
    outdatedVersion,
    isAppRunning,
    isLoading,
    /** The error from the latest refresh, if it failed. */
    error,
    refresh: revalidate,
  };
}
