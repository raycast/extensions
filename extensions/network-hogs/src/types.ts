export type Units = "bytes" | "bits";
export type SortBy = "combined" | "download" | "upload";

export interface ProcessInfo {
  pid: number;
  ppid: number;
  uid: number;
  startedAt: string;
  executable: string;
}

export interface ApplicationInfo {
  name: string;
  path: string;
  bundleId?: string;
}

export interface Counters {
  pid: number;
  name: string;
  bytesIn: number;
  bytesOut: number;
}

export interface RawSample {
  timestamp: number;
  monotonicMs: number;
  rows: Counters[];
}

export type AppIdentity = { kind: "app"; path: string; bundleId: string | null } | { kind: "process" };

export interface TrafficPoint {
  timestamp: number;
  downloadBps: number;
  uploadBps: number;
}

export interface NetworkProcess extends ProcessInfo {
  name: string;
  downloadBps: number;
  uploadBps: number;
}

export interface AppUsage {
  id: string;
  name: string;
  identity: AppIdentity;
  isSystem: boolean;
  note: string | null;
  downloadBps: number;
  uploadBps: number;
  downloadedBytes: number;
  uploadedBytes: number;
  processes: NetworkProcess[];
  history: TrafficPoint[];
}

export interface NetworkSnapshot {
  timestamp: number;
  startedAt: number;
  sampledSeconds: number;
  apps: AppUsage[];
}
