// ── API types (mirror ui/observability/types.ts, which mirrors src/observability) ──
// This is a faithful copy so the Raycast client and the web dashboard share one
// contract. Keep in sync with ui/observability/types.ts when the server changes.

export type Risk =
  "READ" | "WRITE" | "WRITE_IDEMPOTENT" | "DESTRUCTIVE" | "DANGEROUS";
export interface ToolEvent {
  id: string;
  ts: number;
  tool: string;
  title: string;
  risk: Risk;
  device?: string;
  transport?: string;
  durationMs: number;
  isError: boolean;
  error?: string;
  input: string;
  output: string;
  outputBytes: number;
  hasStructured: boolean;
  truncated: boolean;
  reason?: string;
}
export interface Bucket {
  t: number;
  ok: number;
  error: number;
}
export interface Stats {
  total: number;
  errors: number;
  errorRate: number;
  callsPerMin: number;
  outputBytes: number;
  latency: { avg: number; p50: number; p95: number; p99: number; max: number };
  byTool: {
    tool: string;
    count: number;
    errors: number;
    avgMs: number;
    p95Ms: number;
  }[];
  byRisk: Record<Risk, number>;
  byDevice: { device: string; count: number }[];
  byStatus: { ok: number; error: number };
  series: Bucket[];
  recentErrors: { id: string; ts: number; tool: string; error: string }[];
  distinctTools: number;
  distinctDevices: number;
  windowMs: number;
}
export interface Meta {
  version: string;
  tools: string[];
  devices: string[];
  risks: Risk[];
  total: number;
  liveClients: number;
  transport: string;
}
export interface DeviceStatus {
  reachable: boolean | null;
  checkedAt: number | null;
  latencyMs: number | null;
  identity?: string;
  version?: string;
  error?: string;
  boardName?: string;
  architecture?: string;
  cpuCount?: number;
  cpuLoad?: number;
  freeMemory?: number;
  totalMemory?: number;
  memUsedPct?: number;
  freeHdd?: number;
  totalHdd?: number;
  hddUsedPct?: number;
  uptime?: string;
}
export interface MetricSample {
  ts: number;
  cpuLoad: number | null;
  memUsedPct: number | null;
  hddUsedPct: number | null;
  latencyMs: number | null;
}
export interface DevicePoolStatus {
  device: string;
  /** True when there is a live pooled SSH connection for this device. */
  pooled: boolean;
  inflight: number;
  idle: boolean;
  dead: boolean;
}
export interface SSHPoolPayload {
  enabled: boolean;
  config: {
    keepAlive: boolean;
    keepAliveInterval: number;
    idleTimeout: number;
  };
  aggregate: {
    totalConnections: number;
    totalInflight: number;
    totalIdle: number;
    totalBusy: number;
  };
  devices: Array<{
    device: string;
    inflight: number;
    idle: boolean;
    dead: boolean;
  }>;
}
export interface DeviceInfo {
  name: string;
  host: string;
  port: number;
  /** Set when the device is reached over Layer-2 MAC-Telnet instead of SSH. */
  mac?: string;
  transport?: string;
  /** Display address: the MAC for a mac-telnet device, else `host:port`. */
  address?: string;
  username: string;
  authMode: string;
  isDefault: boolean;
  description?: string;
  /** Name of another configured device used as an SSH jump host (bastion). */
  jumpVia?: string;
  /** Inline SSH bastion (host/port only; no secrets) when not a named device. */
  jumpHost?: { host: string; port: number };
  status: DeviceStatus;
  history?: MetricSample[];
  activity: { calls: number; errors: number; lastSeen: number; avgMs: number };
  /** Whether this device is excluded from the MCP tool surface. */
  disabled?: boolean;
  /** SSH connection pool status; null for MAC-Telnet devices or when pool is off. */
  pool: DevicePoolStatus | null;
}
export interface DevicesPayload {
  server: string;
  defaultDevice: string;
  devices: DeviceInfo[];
}
export interface TopoNode {
  id: string;
  kind: "device" | "neighbor";
  label: string;
  configured: boolean;
  onboardable: boolean;
  identity?: string;
  ip?: string;
  mac?: string;
  platform?: string;
  board?: string;
  version?: string;
  reachable?: boolean | null;
  cpuLoad?: number;
  memUsedPct?: number;
  uptime?: string;
  suggestedConfig?: {
    name: string;
    host?: string;
    mac?: string;
    port: number;
    username: string;
  };
}
export interface TopoEdge {
  from: string;
  to: string;
  interface?: string;
}
export interface TopologyPayload {
  server: string;
  defaultDevice: string;
  generatedAt: number;
  nodes: TopoNode[];
  edges: TopoEdge[];
  stats: { devices: number; neighbors: number; onboardable: number };
}
export interface PacketSummary {
  ts: number;
  len: number;
  ethType: string;
  src?: string;
  dst?: string;
  protocol?: string;
  info: string;
}
export interface CaptureStats {
  running: boolean;
  port: number;
  startedAt: number | null;
  packets: number;
  bytes: number;
  protocols: Record<string, number>;
  topTalkers: { addr: string; count: number }[];
  pcapFrames: number;
}
export interface CapturePayload {
  packets: PacketSummary[];
  stats: CaptureStats;
}
export type Filter = {
  tool: string;
  risk: string;
  device: string;
  status: string;
  q: string;
};
export type LiveMode = "ws" | "sse" | "off";

// ── Knowledge Graph Memory ──────────────────────────────────────────────────
export interface MemoryEntity {
  name: string;
  entityType: string;
  observations: string[];
  createdAt: number;
  updatedAt: number;
}
export interface MemoryRelation {
  from: string;
  to: string;
  relationType: string;
  createdAt: number;
}
export interface MemoryGraph {
  entities: MemoryEntity[];
  relations: MemoryRelation[];
}
export interface MemoryStats {
  entities: number;
  relations: number;
  observations: number;
  entityTypes: { type: string; count: number }[];
  relationTypes: { type: string; count: number }[];
  recentActivity: MemoryActivityEntry[];
}
export interface MemoryActivityEntry {
  id: number;
  ts: number;
  action: string;
  subject: string;
  detail?: string;
}
export interface MemoryConfig {
  enabled: boolean;
  dbPath: string;
  stats: MemoryStats | null;
}

// ── Config Drift Guardian ──────────────────────────────────────────────────
export interface DriftBaseline {
  device: string;
  snapshotId: string;
  setAt: number;
  setBy: string;
  label?: string;
  notes?: string;
  snapshot?: {
    lines: number;
    bytes: number;
    sha: string;
    rosVersion?: string;
  } | null;
}
export interface DriftDeviceStatus {
  device: string;
  status: "in-sync" | "drifted" | "unknown" | "no-baseline";
  baseline: DriftBaseline | null;
  latestSnapshotId?: string;
  latestSnapshotTs?: number;
  error?: string;
}
export interface DriftSection {
  path: string;
  added: number;
  removed: number;
  hunks: string;
}
export interface DriftAttribution {
  section: string;
  timestamp?: string;
  user?: string;
  action?: string;
  logLine: string;
}
export interface DriftReport {
  device: string;
  baselineId: string;
  baselineTs: number;
  capturedAt: number;
  identical: boolean;
  score: number;
  summary: { added: number; removed: number; unchanged: number };
  sections: DriftSection[];
  attributions: DriftAttribution[];
  unified: string;
}

// ── Shared diff shape (every /api/*/diff route returns this) ────────────────
export interface DiffSummary {
  added: number;
  removed: number;
  unchanged: number;
  changed: number;
}

// ── Config snapshots (snapshots.tsx) ────────────────────────────────────────
export interface Snapshot {
  id: string;
  device: string;
  ts: number;
  label?: string;
  rosVersion?: string;
  bytes: number;
  lines: number;
  sha: string;
  body?: string;
}

// ── Common mutation result envelope (postJson routes) ───────────────────────
export interface OpResult {
  ok?: boolean;
  error?: string;
  message?: string;
  persisted?: boolean;
  requiresReconnect?: boolean;
  warning?: string;
}

// ── Usage history + heatmap (usage-charts, clients, aaa) ────────────────────
export interface DailyUsage {
  day: string;
  rx: number;
  tx: number;
}
export interface UsagePayload {
  series: DailyUsage[];
  totalRx: number;
  totalTx: number;
}
export interface DayCount {
  day: string;
  count: number;
}
export interface HeatmapPayload {
  days: DayCount[];
  total: number;
  max: number;
}

// ── S3 backups (s3.tsx) ─────────────────────────────────────────────────────
export interface S3Object {
  key: string;
  size: number;
  lastModified: string;
}
export interface S3List {
  configured: boolean;
  target?: string;
  objects: S3Object[];
  truncated?: boolean;
}

// ── Change plan (change-plan.tsx) ───────────────────────────────────────────
export interface PlanStep {
  index: number;
  command: string;
  path: string;
  op: string;
  risk: string;
  summary: string;
  lockoutRisk?: string;
}
export interface ChangePlan {
  steps: PlanStep[];
  counts: {
    add: number;
    modify: number;
    remove: number;
    other: number;
    total: number;
  };
  riskScore: number;
  grade: string;
  warnings: string[];
  reordered: boolean;
}

// ── Tool modules (modules.tsx) ──────────────────────────────────────────────
export interface ModuleItem {
  slug: string;
  label: string;
  group: string;
  description: string;
  toolCount: number;
  enabled: boolean;
}
export interface ModuleSurface {
  modules: ModuleItem[];
  total: number;
  enabledModules: number;
  enabledTools: number;
  totalTools: number;
  hasAllowList: boolean;
  source?: { path: string; fromFile: boolean };
  appViews?: boolean;
}

// ── Local backup vault (backups.tsx) ────────────────────────────────────────
export interface BackupItem {
  name: string;
  bytes: number;
  modified: number;
  device?: string;
}
export interface BackupsData {
  dir: string;
  devices: string[];
  backups: BackupItem[];
}

// ── Config studio + history (config.tsx) ────────────────────────────────────
export interface ConfigIssue {
  path: string;
  message: string;
}
export interface CfgVersion {
  id: string;
  ts: number;
  kind: "auto" | "checkpoint";
  label?: string;
  bytes: number;
  drift: { added: number; removed: number };
}

// ── Drift history snapshot metadata (drift.tsx) ─────────────────────────────
export interface SnapshotMeta {
  id: string;
  ts: number;
  label?: string;
  lines: number;
  bytes: number;
  sha: string;
}
