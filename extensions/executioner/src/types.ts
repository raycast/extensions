export interface Process {
  pid: number;
  ppid: number;
  cpu: number;
  memPercent: number;
  rss: number; // KB
  elapsed: string;
  nice: number;
  comm: string; // full path
  name: string; // basename
  appName?: string;
  type: ProcessType;
  frozen?: boolean;
}

export type ProcessType = "app" | "system" | "helper";

export type SortField = "cpu" | "mem" | "pid" | "name" | "type";
export type SortOrder = "asc" | "desc";
export type GroupMode = "none" | "type" | "parent" | "usage-tier";
export type UsageTier = "hog" | "normal" | "idle";

export interface ProcessGroup {
  key: string;
  label: string;
  processes: Process[];
  aggregateCpu: number;
  aggregateMem: number;
}

export interface KilledEntry {
  pid: number;
  name: string;
  comm: string;
  killedAt: number;
}

export interface PortProcess {
  pid: number;
  port: number;
  protocol: string;
  command: string;
}

export interface Preferences {
  refreshInterval: string;
  cpuThreshold: string;
  memThreshold: string;
  showPid: boolean;
  closeAfterKill: boolean;
}
