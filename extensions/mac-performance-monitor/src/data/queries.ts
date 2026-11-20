/**
 * Every query the extension runs against the Mac Performance Monitor database,
 * plus the in-memory steps that turn raw rows into what the views show
 * (grouping processes into apps, sorting).
 *
 * Facts about the database that shaped this file:
 * - Raw rows (`system_samples`, `process_samples`) are kept for as long as the
 *   app's "high-res age" setting says (2 hours by default). The charts read only
 *   this tier, and only offer ranges that fit inside it.
 * - A process row is written only when its numbers changed, or on a heartbeat
 *   once per `minute_bucket_seconds` (stored in the `meta` table).
 * - `disk_read` / `disk_written` per process are lifetime totals, not rates.
 * - Some columns are nullable: the app writes NULL when a reading was not taken
 *   (no fan on a fanless Mac, a sensor that was not read on that tick).
 */

import { executeSQL } from "@raycast/utils";
import { execFile } from "child_process";
import os from "os";
import path from "path";
import { promisify } from "util";
import { AppGroup, SubprocessItem, SystemHistoryPoint, SystemSnapshot } from "./types";

const execFileAsync = promisify(execFile);

/** Where the native app keeps its database. executeSQL opens it read-only. */
const DATABASE_PATH = path.join(
  os.homedir(),
  "Library/Application Support/MacPerformanceMonitor/macperfmonitor.sqlite",
);

/** Rounds to one decimal place. */
function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

// ---------------------------------------------------------------------------
// Latest system snapshot
// ---------------------------------------------------------------------------

/** The `system_samples` columns the extension reads, names as in the database. */
interface RawSystemSample {
  timestamp: number;
  total_ram: number;
  free: number;
  wired: number;
  compressed: number;
  app_memory: number;
  cached_files: number;
  swap_used: number;
  pressure_level: number;
  pressure_percent: number;
  cpu_load: number;
  cpu_die: number | null;
  thermal_state: number | null;
  battery_present: number;
  battery_charge: number;
  battery_charging: number;
}

/** Maps the app's thermal state code onto a name. NULL means it was not read. */
function parseThermalState(code: number | null): string {
  switch (code) {
    case 0:
      return "nominal";
    case 1:
      return "fair";
    case 2:
      return "serious";
    case 3:
      return "critical";
    default:
      return "unknown";
  }
}

/** Fetches the most recent system sample, or null if the table is empty. */
export async function getLatestSnapshot(): Promise<SystemSnapshot | null> {
  const sql = `
    SELECT timestamp, total_ram, free, wired, compressed, app_memory, cached_files, swap_used,
      pressure_level, pressure_percent, cpu_load, cpu_die, thermal_state,
      battery_present, battery_charge, battery_charging
    FROM system_samples
    ORDER BY timestamp DESC
    LIMIT 1;
  `;
  const rows = await executeSQL<RawSystemSample>(DATABASE_PATH, sql);
  if (rows.length === 0) {
    return null;
  }
  const r = rows[0];

  return {
    timestamp: r.timestamp,
    totalRam: r.total_ram,
    freeRam: r.free,
    wiredRam: r.wired,
    compressedRam: r.compressed,
    appMemory: r.app_memory,
    cachedFiles: r.cached_files,
    swapUsed: r.swap_used,
    pressureLevel: r.pressure_level,
    pressurePercent: r.pressure_percent,
    cpuLoad: r.cpu_load,
    cpuDieTemp: r.cpu_die,
    thermalState: parseThermalState(r.thermal_state),
    batteryPresent: r.battery_present === 1,
    batteryCharge: r.battery_charge,
    batteryCharging: r.battery_charging === 1,
  };
}

// ---------------------------------------------------------------------------
// System history (for the charts)
// ---------------------------------------------------------------------------

/** How many points a history query aims for. The charts downsample further to 60. */
const HISTORY_TARGET_POINTS = 120;

/**
 * The narrowest chart bucket. With its window closed the app writes a raw sample
 * about every 10 s whatever its interval setting says, and is sometimes a few
 * seconds late (up to 17.7 s apart over two hours measured on 2026-11-20).
 */
const MIN_BUCKET_SECONDS = 20;

/** One row of the history query below. The nullable columns can average to NULL. */
interface RawHistoryRow {
  bucket: number;
  cpu_percent: number;
  memory_pressure: number;
  gpu_percent: number | null;
  disk_read_mb: number;
  disk_write_mb: number;
  cpu_temp: number | null;
  gpu_temp: number | null;
  power_watts: number | null;
}

/**
 * A chart line needs a number for every point. A missing reading is drawn at 0,
 * so a gap in the recording shows up on the chart as a drop.
 */
function missingAsZero(value: number | null): number {
  if (value === null) {
    return 0;
  }
  return value;
}

/** A history point for a bucket that has no samples: everything is 0. */
function emptyPoint(timestamp: number): SystemHistoryPoint {
  return {
    timestamp: timestamp,
    cpuPercent: 0,
    memoryPressure: 0,
    gpuPercent: 0,
    diskReadMb: 0,
    diskWriteMb: 0,
    cpuTemp: 0,
    gpuTemp: 0,
    powerWatts: 0,
  };
}

/**
 * Loads the history for a window from the raw `system_samples` table.
 *
 * The window is cut into equal buckets that each hold the average of the samples
 * inside them. Every bucket in the window gets a point, in time order, so the
 * charts space points by time: a stretch where nothing was recorded (the app was
 * not running, the Mac was asleep) stays at 0 and shows as a drop.
 *
 * Buckets are never narrower than MIN_BUCKET_SECONDS or two of the app's recording
 * intervals, whichever is longer, so a bucket is only empty when the app really
 * stopped recording, not just because it was narrower than the time between two samples.
 */
export async function getSystemHistory(
  windowSeconds: number,
  rawIntervalSeconds: number,
): Promise<SystemHistoryPoint[]> {
  let bucketSeconds = Math.round(windowSeconds / HISTORY_TARGET_POINTS);
  if (bucketSeconds < MIN_BUCKET_SECONDS) {
    bucketSeconds = MIN_BUCKET_SECONDS;
  }
  if (bucketSeconds < 2 * rawIntervalSeconds) {
    bucketSeconds = 2 * rawIntervalSeconds;
  }
  const bucketCount = Math.round(windowSeconds / bucketSeconds);

  // CAST(timestamp / N AS INT) * N rounds each timestamp down to the start of its bucket.
  const sql = `
    SELECT
      CAST(timestamp / ${bucketSeconds} AS INT) * ${bucketSeconds} AS bucket,
      avg(cpu_load * 100) AS cpu_percent,
      avg(pressure_percent) AS memory_pressure,
      avg(gpu_util) AS gpu_percent,
      avg(disk_read) / 1048576.0 AS disk_read_mb,
      avg(disk_write) / 1048576.0 AS disk_write_mb,
      avg(cpu_die) AS cpu_temp,
      avg(gpu_die) AS gpu_temp,
      avg(energy_power) AS power_watts
    FROM system_samples
    WHERE timestamp >= (SELECT MAX(timestamp) FROM system_samples) - ${windowSeconds}
    GROUP BY bucket
    ORDER BY bucket ASC;
  `;

  const rows = await executeSQL<RawHistoryRow>(DATABASE_PATH, sql);
  if (rows.length === 0) {
    return [];
  }

  // Start with an empty point for every bucket, ending at the newest bucket.
  const lastBucket = rows[rows.length - 1].bucket;
  const firstBucket = lastBucket - (bucketCount - 1) * bucketSeconds;
  const points: SystemHistoryPoint[] = [];
  for (let i = 0; i < bucketCount; i++) {
    points.push(emptyPoint(firstBucket + i * bucketSeconds));
  }

  // Then put each recorded bucket into its slot. The query can return one partial
  // bucket older than the window's first slot; that one is skipped.
  for (const r of rows) {
    const index = (r.bucket - firstBucket) / bucketSeconds;
    if (index < 0) {
      continue;
    }
    points[index] = {
      timestamp: r.bucket,
      cpuPercent: r.cpu_percent,
      memoryPressure: r.memory_pressure,
      gpuPercent: missingAsZero(r.gpu_percent),
      diskReadMb: r.disk_read_mb,
      diskWriteMb: r.disk_write_mb,
      cpuTemp: missingAsZero(r.cpu_temp),
      gpuTemp: missingAsZero(r.gpu_temp),
      powerWatts: missingAsZero(r.power_watts),
    };
  }
  return points;
}

// ---------------------------------------------------------------------------
// Live process table (from the `ps` command)
// ---------------------------------------------------------------------------

/**
 * Pulls the app name out of a path that goes through a `.app` bundle.
 * "/Applications/Safari.app/Contents/MacOS/Safari" gives "Safari".
 * The first `.app` in the path wins, so a helper nested inside a bundle
 * ("Google Chrome.app/.../Google Chrome Helper.app/...") resolves to the outer app.
 * Returns null when the path has no `.app` component.
 */
export function extractAppNameFromPath(filePath: string | null): string | null {
  if (filePath === null) {
    return null;
  }
  const match = filePath.match(/(?:^|\/)([^/]+)\.app(?:\/|$)/i);
  if (match === null) {
    return null;
  }
  return match[1];
}

/** The main binary of the native app. Its presence in `ps` means the recorder is running. */
const MONITOR_BINARY = "/Mac Performance Monitor.app/Contents/MacOS/Mac Performance Monitor";

/** A snapshot of the processes running on this Mac right now. */
export interface ProcessTree {
  /** Child PID to parent PID. */
  parentMap: Map<number, number>;
  /** PID to app name, for processes whose binary lives inside a `.app` bundle. */
  appByPid: Map<number, string>;
  /** Whether the Mac Performance Monitor app itself is running. */
  isMonitorRunning: boolean;
}

/** Runs `ps` and reads the current process table. Throws if `ps` fails. */
export async function getProcessTree(): Promise<ProcessTree> {
  const result = await execFileAsync("/bin/ps", ["-axo", "pid,ppid,comm"], { maxBuffer: 4 * 1024 * 1024 });
  const tree: ProcessTree = { parentMap: new Map(), appByPid: new Map(), isMonitorRunning: false };

  // One process per line, header line first.
  const lines = result.stdout.split("\n");
  for (let i = 1; i < lines.length; i++) {
    // Each line looks like "  123   1 /path/to/binary". The path may contain spaces,
    // so take the first two numbers and treat everything after as the path.
    const match = lines[i].trim().match(/^(\d+)\s+(\d+)\s+(.*)$/);
    if (match === null) {
      continue;
    }
    const pid = Number(match[1]);
    const parentPid = Number(match[2]);
    const command = match[3];

    tree.parentMap.set(pid, parentPid);

    const appName = extractAppNameFromPath(command);
    if (appName !== null) {
      tree.appByPid.set(pid, appName);
    }
    if (command.endsWith(MONITOR_BINARY)) {
      tree.isMonitorRunning = true;
    }
  }

  return tree;
}

// ---------------------------------------------------------------------------
// Recorded processes with their latest sample
// ---------------------------------------------------------------------------

/** One recorded process with its most recent values. */
export interface ActiveProcess {
  pid: number;
  name: string;
  executablePath: string | null;
  bundleId: string | null;
  architecture: string;
  isTranslated: boolean;
  memoryBytes: number;
  /** Percent of one core, so it can exceed 100. */
  cpuPercent: number;
  gpuPercent: number;
  energyImpact: number;
  /** Bytes read per second over the recent window (0 when only one sample exists). */
  diskReadRate: number;
  /** Bytes written per second over the recent window (0 when only one sample exists). */
  diskWriteRate: number;
}

/** One row of the query in getActiveProcesses. */
interface RawActiveProcessRow {
  pid: number;
  name: string;
  executable_path: string | null;
  bundle_id: string | null;
  architecture: string;
  is_translated: number;
  phys_footprint: number;
  cpu_percent: number;
  gpu_percent: number;
  energy_impact: number;
  disk_read: number;
  disk_written: number;
  disk_read_prev: number;
  disk_written_prev: number;
  span: number;
}

/**
 * Loads every process that has a sample inside the recent window, with its latest values.
 *
 * Window size: the recorder writes a process row only when something changed, or
 * on a heartbeat once per `minute_bucket_seconds` (default 60, user configurable).
 * The window is one heartbeat plus slack so idle processes are not missed.
 * Processes that have since quit are removed later against the live `ps` table.
 *
 * Disk rate: `disk_read` and `disk_written` are totals since the process started,
 * so the rate is (newest - oldest) / seconds between them.
 */
export async function getActiveProcesses(): Promise<ActiveProcess[]> {
  // The "window_samples" part finds, per process, the newest and oldest sample in the
  // window. The main SELECT then joins the newest row (for current values), the oldest
  // row (for the disk rate), and the process's identity row.
  const sql = `
    WITH window_samples AS (
      SELECT process_id, MAX(timestamp) AS max_ts, MIN(timestamp) AS min_ts
      FROM process_samples
      WHERE timestamp >= (SELECT MAX(timestamp) FROM process_samples)
        - (COALESCE((SELECT value FROM meta WHERE key = 'minute_bucket_seconds'), 60) + 15)
      GROUP BY process_id
    )
    SELECT
      p.pid,
      p.name,
      p.executable_path,
      p.bundle_id,
      p.architecture,
      p.is_translated,
      latest.phys_footprint,
      latest.cpu_percent,
      latest.gpu_percent,
      latest.energy_impact,
      latest.disk_read,
      latest.disk_written,
      oldest.disk_read AS disk_read_prev,
      oldest.disk_written AS disk_written_prev,
      (w.max_ts - w.min_ts) AS span
    FROM window_samples w
    JOIN process_samples latest ON latest.process_id = w.process_id AND latest.timestamp = w.max_ts
    JOIN process_samples oldest ON oldest.process_id = w.process_id AND oldest.timestamp = w.min_ts
    JOIN processes p ON p.id = w.process_id;
  `;

  const rows = await executeSQL<RawActiveProcessRow>(DATABASE_PATH, sql);

  const processes: ActiveProcess[] = [];
  for (const r of rows) {
    let diskReadRate = 0;
    let diskWriteRate = 0;
    if (r.span > 0) {
      diskReadRate = Math.max(0, (r.disk_read - r.disk_read_prev) / r.span);
      diskWriteRate = Math.max(0, (r.disk_written - r.disk_written_prev) / r.span);
    }

    processes.push({
      pid: r.pid,
      name: r.name,
      executablePath: r.executable_path,
      bundleId: r.bundle_id,
      architecture: r.architecture,
      isTranslated: r.is_translated === 1,
      memoryBytes: r.phys_footprint,
      cpuPercent: r.cpu_percent,
      gpuPercent: r.gpu_percent,
      energyImpact: r.energy_impact,
      diskReadRate: diskReadRate,
      diskWriteRate: diskWriteRate,
    });
  }
  return processes;
}

// ---------------------------------------------------------------------------
// Grouping processes into applications
// ---------------------------------------------------------------------------

/**
 * The kernel truncates process names to 16 characters. When the name looks
 * truncated and we know the binary's path, use the file name from the path instead.
 */
function resolveProcessName(name: string, executablePath: string | null): string {
  if (executablePath !== null && name.length >= 15) {
    const lastSlash = executablePath.lastIndexOf("/");
    const fileName = executablePath.substring(lastSlash + 1);
    if (fileName.length > 0) {
      return fileName;
    }
  }
  if (name.length === 0) {
    return "Unknown";
  }
  return name;
}

/**
 * Decides which application a process belongs to, in this order:
 * 1. The PID is already attributed to an app (its own binary is inside a `.app`,
 *    or `ps` saw it there).
 * 2. An ancestor process belongs to an app. This is how a shell or compiler
 *    running under a terminal or IDE is counted toward that terminal or IDE.
 * 3. WebKit content processes without a known owner belong to "Safari / WebKit".
 * 4. Otherwise the process stands alone under its own (de-truncated) name.
 *
 * Results are memoized into `appByPid` so the ancestor walk runs once per PID.
 */
function resolveAppName(proc: ActiveProcess, appByPid: Map<number, string>, parentMap: Map<number, number>): string {
  const known = appByPid.get(proc.pid);
  if (known !== undefined) {
    return known;
  }

  // Walk up the parent chain. `visited` guards against a cycle in a broken ps output.
  let currentPid = proc.pid;
  const visited = new Set<number>();
  visited.add(currentPid);
  while (true) {
    const parentPid = parentMap.get(currentPid);
    if (parentPid === undefined || parentPid <= 1 || visited.has(parentPid)) {
      break;
    }
    visited.add(parentPid);

    const ancestorApp = appByPid.get(parentPid);
    if (ancestorApp !== undefined) {
      appByPid.set(proc.pid, ancestorApp);
      return ancestorApp;
    }
    currentPid = parentPid;
  }

  let resolved: string;
  if (proc.executablePath !== null && proc.executablePath.includes("WebKit")) {
    resolved = "Safari / WebKit";
  } else {
    resolved = resolveProcessName(proc.name, proc.executablePath);
  }
  appByPid.set(proc.pid, resolved);
  return resolved;
}

/** A recorded process together with the app it was attributed to. */
interface AttributedProcess {
  proc: ActiveProcess;
  appName: string;
}

/**
 * Drops processes that are no longer running (not in `ps`) and attaches an app name to the rest.
 */
function attributeProcesses(processes: ActiveProcess[], tree: ProcessTree): AttributedProcess[] {
  const alive: ActiveProcess[] = [];
  for (const proc of processes) {
    if (tree.parentMap.has(proc.pid)) {
      alive.push(proc);
    }
  }

  // Work on a copy: resolveAppName writes into this map.
  const appByPid = new Map(tree.appByPid);
  for (const proc of alive) {
    const directApp = extractAppNameFromPath(proc.executablePath);
    if (directApp !== null) {
      appByPid.set(proc.pid, directApp);
    }
  }

  const result: AttributedProcess[] = [];
  for (const proc of alive) {
    result.push({ proc: proc, appName: resolveAppName(proc, appByPid, tree.parentMap) });
  }
  return result;
}

/**
 * Adds up every live process into its application. Pure: no I/O.
 *
 * Each group's "primary" process is the app's own main binary when there is one
 * (lowest PID among those), otherwise the lowest-PID member. Its path and bundle
 * id are what the views show and what Quit App uses.
 */
export function groupProcesses(processes: ActiveProcess[], tree: ProcessTree): AppGroup[] {
  const groups = new Map<string, AppGroup>();
  // Tracks, per group, whether the current primary is the app's own binary.
  const primaryIsAppBinary = new Map<string, boolean>();

  for (const entry of attributeProcesses(processes, tree)) {
    const proc = entry.proc;
    const appName = entry.appName;

    let group = groups.get(appName);
    if (group === undefined) {
      group = {
        appName: appName,
        processCount: 0,
        pids: [],
        memoryBytes: 0,
        cpuPercent: 0,
        gpuPercent: 0,
        diskReadBytes: 0,
        diskWrittenBytes: 0,
        energyImpact: 0,
        primaryPid: proc.pid,
        executablePath: proc.executablePath,
        bundleId: proc.bundleId,
      };
      groups.set(appName, group);
      primaryIsAppBinary.set(appName, false);
    }

    group.processCount += 1;
    group.pids.push(proc.pid);
    group.memoryBytes += proc.memoryBytes;
    group.cpuPercent += proc.cpuPercent;
    group.gpuPercent += proc.gpuPercent;
    group.diskReadBytes += proc.diskReadRate;
    group.diskWrittenBytes += proc.diskWriteRate;
    group.energyImpact += proc.energyImpact;

    // Should this process become the group's primary?
    const isAppBinary = extractAppNameFromPath(proc.executablePath) === appName;
    const currentIsAppBinary = primaryIsAppBinary.get(appName) === true;
    let takeOver = false;
    if (isAppBinary && !currentIsAppBinary) {
      takeOver = true; // an app binary always beats a helper
    } else if (isAppBinary === currentIsAppBinary && proc.pid < group.primaryPid) {
      takeOver = true; // same kind: the older (lower PID) one wins
    }
    if (takeOver) {
      group.primaryPid = proc.pid;
      group.executablePath = proc.executablePath;
      group.bundleId = proc.bundleId;
      primaryIsAppBinary.set(appName, isAppBinary);
    }
  }

  const result: AppGroup[] = [];
  for (const group of groups.values()) {
    group.cpuPercent = round1(group.cpuPercent);
    group.gpuPercent = round1(group.gpuPercent);
    group.energyImpact = round1(group.energyImpact);
    result.push(group);
  }
  return result;
}

/** The metrics an app list can be sorted by. */
export type SortMetric = "memory" | "cpu" | "gpu" | "disk" | "energy";

/** The value of one metric for an app, used for sorting and leaderboards. */
export function metricValue(app: AppGroup, metric: SortMetric): number {
  switch (metric) {
    case "memory":
      return app.memoryBytes;
    case "cpu":
      return app.cpuPercent;
    case "gpu":
      return app.gpuPercent;
    case "disk":
      return app.diskReadBytes + app.diskWrittenBytes;
    case "energy":
      return app.energyImpact;
  }
}

/** Returns a new array sorted by the metric, highest first. Ties are broken by name. */
export function sortApps(apps: AppGroup[], metric: SortMetric): AppGroup[] {
  const sorted = apps.slice();
  sorted.sort((a, b) => {
    const difference = metricValue(b, metric) - metricValue(a, metric);
    if (difference !== 0) {
      return difference;
    }
    return a.appName.localeCompare(b.appName);
  });
  return sorted;
}

/**
 * Lists the live processes that belong to one application, largest memory first.
 */
export async function getAppSubprocesses(appName: string): Promise<SubprocessItem[]> {
  const processes = await getActiveProcesses();
  const tree = await getProcessTree();

  const items: SubprocessItem[] = [];
  for (const entry of attributeProcesses(processes, tree)) {
    if (entry.appName !== appName) {
      continue;
    }
    const proc = entry.proc;
    items.push({
      pid: proc.pid,
      name: resolveProcessName(proc.name, proc.executablePath),
      executablePath: proc.executablePath === null ? "" : proc.executablePath,
      memoryBytes: proc.memoryBytes,
      cpuPercent: round1(proc.cpuPercent),
      gpuPercent: round1(proc.gpuPercent),
      diskReadBytes: proc.diskReadRate,
      diskWrittenBytes: proc.diskWriteRate,
      energyImpact: round1(proc.energyImpact),
      architecture: proc.architecture,
      isTranslated: proc.isTranslated,
    });
  }

  items.sort((a, b) => b.memoryBytes - a.memoryBytes);
  return items;
}
