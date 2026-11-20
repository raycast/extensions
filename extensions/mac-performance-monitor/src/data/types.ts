/**
 * The latest system sample, with the fields the views show.
 * A field is `number | null` when its database column is nullable: the app
 * writes NULL when that reading was not taken.
 */

export interface SystemSnapshot {
  /** Timestamp in seconds (Unix epoch). */
  timestamp: number;
  /** Total physical RAM in bytes. */
  totalRam: number;
  /** Free unallocated RAM in bytes. */
  freeRam: number;
  /** Wired memory in bytes (pinned kernel and framework pages that cannot be paged out). */
  wiredRam: number;
  /** Compressed memory in bytes. */
  compressedRam: number;
  /** App Memory as Activity Monitor defines it: anonymous allocations minus purgeable, in bytes. */
  appMemory: number;
  /** Memory used for file cache in bytes (reclaimable). */
  cachedFiles: number;
  /** Currently used swap space in bytes. */
  swapUsed: number;
  /** Memory pressure level as the app records it: 1 = normal, 2 = warning, 4 = critical. */
  pressureLevel: number;
  /** Memory pressure percentage (0 to 100). */
  pressurePercent: number;
  /** Overall CPU utilization as a fraction (0 to 1). */
  cpuLoad: number;
  /** CPU die temperature in degrees Celsius. */
  cpuDieTemp: number | null;
  /** Thermal pressure state name (nominal, fair, serious, critical, or unknown when not read). */
  thermalState: string;
  /** Whether an internal battery is present. */
  batteryPresent: boolean;
  /** Current battery charge percentage (0 to 100). */
  batteryCharge: number;
  /** Whether the battery is charging. */
  batteryCharging: boolean;
}

/**
 * One point on the history charts: the average of the raw samples in one bucket.
 * Readings that were not taken are 0 here, so the chart shows them as a drop.
 */
export interface SystemHistoryPoint {
  /** Bucket start timestamp in seconds (Unix epoch). */
  timestamp: number;
  /** CPU load percentage at this bucket. */
  cpuPercent: number;
  /** Memory pressure percentage at this bucket. */
  memoryPressure: number;
  /** GPU utilization percentage at this bucket. */
  gpuPercent: number;
  /** Disk read throughput in megabytes per second. */
  diskReadMb: number;
  /** Disk write throughput in megabytes per second. */
  diskWriteMb: number;
  /** CPU die temperature in degrees Celsius. */
  cpuTemp: number;
  /** GPU die temperature in degrees Celsius. */
  gpuTemp: number;
  /** System power draw in watts. */
  powerWatts: number;
}

/**
 * An application group aggregating an app and all child processes working under it.
 * Child processes inherit the identity of their top-level application bundle.
 */
export interface AppGroup {
  /** Display name of the application or top-level process. */
  appName: string;
  /** Number of live processes grouped under this application. */
  processCount: number;
  /** PIDs of every live process in the group. */
  pids: number[];
  /** Sum of physical memory footprint across all grouped processes, in bytes. */
  memoryBytes: number;
  /** Combined CPU usage, in percent of one core (can exceed 100). */
  cpuPercent: number;
  /** Combined GPU usage percentage across all grouped processes. */
  gpuPercent: number;
  /** Combined disk read rate in bytes per second over the recent sampling window. */
  diskReadBytes: number;
  /** Combined disk write rate in bytes per second over the recent sampling window. */
  diskWrittenBytes: number;
  /** Combined energy impact metric. */
  energyImpact: number;
  /** PID of the app's main process, or the oldest member when no main app binary is present. */
  primaryPid: number;
  /** Path to the main executable binary, or null. */
  executablePath: string | null;
  /** Bundle identifier (e.g., com.apple.Safari), or null. */
  bundleId: string | null;
}

/**
 * Detailed information for an individual process running within an application group.
 */
export interface SubprocessItem {
  /** Process ID. */
  pid: number;
  /** Resolved executable binary name or kernel process name. */
  name: string;
  /** Full path to the executable on disk, or empty string. */
  executablePath: string;
  /** Physical memory footprint in bytes. */
  memoryBytes: number;
  /** CPU usage in percent of one core. */
  cpuPercent: number;
  /** GPU usage percentage. */
  gpuPercent: number;
  /** Disk read rate in bytes per second. */
  diskReadBytes: number;
  /** Disk write rate in bytes per second. */
  diskWrittenBytes: number;
  /** Energy impact rating. */
  energyImpact: number;
  /** CPU architecture string (arm64, x86_64). */
  architecture: string;
  /** True if running under Rosetta 2 translation. */
  isTranslated: boolean;
}

/**
 * A chart time range ("5m" to "48h"). Taken from the generated preference types
 * (raycast-env.d.ts), so it always matches the "Default Time Range" options in package.json.
 */
export type TimeRange = Preferences["defaultRange"];
