export type ModuleKey = "cpu" | "memory" | "disk" | "uptime" | "network" | "battery" | "codex" | "claude";

export interface CpuMetric {
  percent: number;
}

export interface MemoryMetric {
  percent: number;
  usedBytes: number;
  totalBytes: number;
}

export interface DiskMetric {
  percent: number;
  usedBytes: number;
  totalBytes: number;
  availableBytes: number;
}

export interface UptimeMetric {
  seconds: number;
}

export interface NetworkMetric {
  interfaceName: string;
  downloadBytesPerSecond: number;
  uploadBytesPerSecond: number;
  totalReceivedBytes: number;
  totalSentBytes: number;
  ready: boolean;
}

export interface NetworkHistory {
  interfaceName?: string;
  download: number[];
  upload: number[];
}

export interface BatteryMetric {
  percent: number;
  state: "charging" | "charged" | "discharging" | "unknown";
  timeRemaining?: string;
}

export interface RateLimitWindow {
  usedPercent: number;
  windowDurationMins: number | null;
  resetsAt: number | null;
}

export interface CodexLimit {
  id: string;
  name: string;
  planType?: string | null;
  primary?: RateLimitWindow | null;
  secondary?: RateLimitWindow | null;
}

export interface CodexMetric {
  limits: CodexLimit[];
}

export interface ClaudeUsageWindow {
  id: "five-hour" | "weekly";
  name: string;
  usedPercent: number;
}

export interface ClaudeMetric {
  updatedAt: number;
  windows: ClaudeUsageWindow[];
}

export interface StatusSnapshot {
  updatedAt: number;
  cpu?: CpuMetric;
  memory?: MemoryMetric;
  disk?: DiskMetric;
  uptime?: UptimeMetric;
  network?: NetworkMetric;
  battery?: BatteryMetric;
  codex?: CodexMetric;
  claude?: ClaudeMetric;
  errors: Partial<Record<ModuleKey, string>>;
}

export interface ModulePreferences {
  showCpu: boolean;
  showMemory: boolean;
  showDisk: boolean;
  showUptime: boolean;
  showNetwork: boolean;
  showBattery: boolean;
  showCodex: boolean;
  showSpark: boolean;
  showClaude: boolean;
  networkUnits: "bytes" | "bits";
  diskVolume: string;
  networkInterface: string;
  codexPath: string;
  claudeUsagePath: string;
}
