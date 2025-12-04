interface SystemInfo {
  /**
   * Network
   */
  b: number;

  /**
   * CPU Cores
   */
  c: number;

  /**
   * CPU
   */
  cpu: number;

  /**
   * Disk
   */
  dp: number;

  /**
   * Hostname
   */
  h: string;

  /**
   * Kernel
   */
  k: string;

  /**
   * CPU Chip
   */
  m: string;

  /**
   * Memory
   */
  mp: number;

  /**
   * Thread Count
   */
  t: number;

  /**
   * Uptime
   */
  u: number;

  /**
   * Agent Version
   */
  v: string;
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
