interface SystemInfo {
  /**
   * Hostname (omitted by the agent when not reported; fall back to the
   * top-level `host` field).
   */
  h?: string;

  /**
   * Kernel version (omitted when not reported by the agent)
   */
  k?: string;

  /**
   * CPU cores (omitted when zero / not reported)
   */
  c?: number;

  /**
   * Thread count (omitted when not reported)
   */
  t?: number;

  /**
   * CPU model / chip (omitted when not reported)
   */
  m?: string;

  /**
   * Uptime (seconds)
   */
  u: number;

  /**
   * CPU percent
   */
  cpu: number;

  /**
   * Memory percent
   */
  mp: number;

  /**
   * Disk percent
   */
  dp: number;

  /**
   * Bandwidth in MB (deprecated, replaced by `bb`)
   */
  b?: number;

  /**
   * Bandwidth in bytes (omitted by older instances that only report `b`)
   */
  bb?: number;

  /**
   * Agent version
   */
  v: string;

  /**
   * Whether the agent is running under Podman
   */
  p?: boolean;

  /**
   * Highest GPU utilization percent
   */
  g?: number;

  /**
   * Dashboard temperature (Celsius)
   */
  dt?: number;

  /**
   * Load average [1m, 5m, 15m]
   */
  la?: [number, number, number];

  /**
   * Connection type
   */
  ct?: number;

  /**
   * Extra filesystem usage percentages, keyed by mount name
   */
  efs?: Record<string, number>;

  /**
   * Services [total, failed]
   */
  sv?: [number, number];

  /**
   * Battery [percent, charge state]
   */
  bat?: [number, number];
}

export type BeszelSystemStatus = "up" | "down" | "paused" | "pending";

export interface BeszelSystem {
  collectionId: string;
  collectionName: string;
  created: string;
  host: string;
  id: string;
  info: SystemInfo;
  name: string;
  port: string;
  status: BeszelSystemStatus;
  updated: string;
  users: string[];
}
