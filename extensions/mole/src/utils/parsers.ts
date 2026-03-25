export interface MoleStatus {
  collected_at: string;
  host: string;
  platform: string;
  uptime: string;
  procs: number;
  hardware: HardwareInfo;
  health_score: number;
  health_score_msg: string;
  cpu: CpuInfo;
  gpu: GpuInfo[];
  memory: MemoryInfo;
  disks: DiskInfo[];
  disk_io: DiskIoInfo;
  network: NetworkInterface[];
  network_history: NetworkHistory;
  proxy: ProxyInfo;
  batteries: BatteryInfo[];
  thermal: ThermalInfo;
  sensors: unknown;
  bluetooth: BluetoothDevice[];
  top_processes: ProcessInfo[];
}

export interface HardwareInfo {
  model: string;
  cpu_model: string;
  total_ram: string;
  disk_size: string;
  os_version: string;
  refresh_rate: string;
}

export interface CpuInfo {
  usage: number;
  per_core: number[];
  per_core_estimated: boolean;
  load1: number;
  load5: number;
  load15: number;
  core_count: number;
  logical_cpu: number;
  p_core_count: number;
  e_core_count: number;
}

export interface GpuInfo {
  name: string;
  usage: number;
  memory_used: number;
  memory_total: number;
  core_count: number;
  note: string;
}

export interface MemoryInfo {
  used: number;
  total: number;
  used_percent: number;
  swap_used: number;
  swap_total: number;
  cached: number;
  pressure: string;
}

export interface DiskInfo {
  mount: string;
  device: string;
  used: number;
  total: number;
  used_percent: number;
  fstype: string;
  external: boolean;
}

export interface DiskIoInfo {
  read_rate: number;
  write_rate: number;
}

export interface NetworkInterface {
  name: string;
  rx_rate_mbs: number;
  tx_rate_mbs: number;
  ip: string;
}

export interface NetworkHistory {
  rx_history: number[];
  tx_history: number[];
}

export interface ProxyInfo {
  enabled: boolean;
  type: string;
  host: string;
}

export interface BatteryInfo {
  percent: number;
  status: string;
  time_left: string;
  health: string;
  cycle_count: number;
  capacity: number;
}

export interface ThermalInfo {
  cpu_temp: number;
  gpu_temp: number;
  fan_speed: number;
  fan_count: number;
  system_power: number;
  adapter_power: number;
  battery_power: number;
}

export interface BluetoothDevice {
  name: string;
  connected: boolean;
  battery: string;
}

export interface ProcessInfo {
  name: string;
  cpu: number;
  memory: number;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function formatRate(mbPerSec: number): string {
  if (mbPerSec < 0.001) return "0 KB/s";
  if (mbPerSec < 1) return `${(mbPerSec * 1024).toFixed(0)} KB/s`;
  return `${mbPerSec.toFixed(1)} MB/s`;
}

export function stripAnsi(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/\x1B\[[0-9;]*m/g, "");
}

function parseSizeString(s: string): number {
  if (!s) return 0;
  const match = s.match(/([\d.]+)\s*(B|KB|MB|GB|TB)/i);
  if (!match) return 0;
  const val = parseFloat(match[1]);
  const units: Record<string, number> = { B: 1, KB: 1024, MB: 1048576, GB: 1073741824, TB: 1099511627776 };
  return val * (units[match[2].toUpperCase()] || 0);
}

export interface CleanItem {
  description: string;
  size: string;
  count: number;
}

export interface CleanSection {
  name: string;
  items: CleanItem[];
}

export interface CleanDryRunResult {
  sections: CleanSection[];
  totalSpace: string;
  totalItems: number;
}

function parseCleanLine(rawLine: string): { description: string; size: string } | null {
  const line = rawLine.trim();
  if (!line.startsWith("\u2192") && !line.startsWith("→")) return null;

  const content = line.replace(/^[→\u2192]\s*/, "");
  if (!content) return null;

  const sizeMatch = content.match(/([\d.]+)\s*(B|KB|MB|GB|TB)\s+dry/i);
  const size = sizeMatch ? `${sizeMatch[1]} ${sizeMatch[2]}` : "";

  const desc = content
    .replace(/,?\s*[\d.]+\s*(?:B|KB|MB|GB|TB)\s+dry/i, "")
    .replace(/\s*\d+\s+items?\s*,?/g, "")
    .replace(/\s*\d+\s+dirs?\s*,?/g, "")
    .replace(/\s*·\s*would\s+.*/i, "")
    .replace(/,\s*$/, "")
    .trim();

  if (!desc) return null;

  return { description: desc, size };
}

function aggregateCleanItems(raw: { description: string; size: string }[]): CleanItem[] {
  const groups = new Map<string, { count: number; totalBytes: number }>();

  for (const item of raw) {
    const existing = groups.get(item.description);
    const bytes = parseSizeString(item.size);
    if (existing) {
      existing.count++;
      existing.totalBytes += bytes;
    } else {
      groups.set(item.description, { count: 1, totalBytes: bytes });
    }
  }

  return Array.from(groups.entries())
    .map(([desc, data]) => ({
      description: desc,
      size: data.totalBytes > 0 ? formatBytes(data.totalBytes) : "",
      count: data.count,
    }))
    .sort((a, b) => parseSizeString(b.size) - parseSizeString(a.size));
}

export function parseCleanDryRun(stdout: string): CleanDryRunResult {
  const text = stripAnsi(stdout);
  const sections: CleanSection[] = [];
  let currentSection: { name: string; rawItems: { description: string; size: string }[] } | null = null;
  let isEmpty = false;

  for (const line of text.split("\n")) {
    const trimmed = line.trim();

    const sectionMatch = trimmed.match(/^➤\s+(.+)$/);
    if (sectionMatch) {
      if (currentSection && !isEmpty && currentSection.rawItems.length > 0) {
        sections.push({ name: currentSection.name, items: aggregateCleanItems(currentSection.rawItems) });
      }
      currentSection = { name: sectionMatch[1], rawItems: [] };
      isEmpty = false;
      continue;
    }

    if (trimmed.includes("Nothing to clean") || trimmed.includes("already clean")) {
      isEmpty = true;
      continue;
    }

    const parsed = parseCleanLine(trimmed);
    if (parsed && currentSection) {
      currentSection.rawItems.push(parsed);
    }
  }

  if (currentSection && !isEmpty && currentSection.rawItems.length > 0) {
    sections.push({ name: currentSection.name, items: aggregateCleanItems(currentSection.rawItems) });
  }

  const totalMatch = text.match(/Potential space:\s*([\d.]+\s*\w+)/);
  const itemsMatch = text.match(/Items:\s*(\d+)/);

  let totalSpace = totalMatch?.[1] || "";
  if (!totalSpace) {
    const allItems = sections.flatMap((s) => s.items);
    const totalBytes = allItems.reduce((sum, item) => sum + parseSizeString(item.size), 0);
    totalSpace = totalBytes > 0 ? formatBytes(totalBytes) : "Scanning...";
  }

  return {
    sections,
    totalSpace,
    totalItems: parseInt(itemsMatch?.[1] || String(sections.reduce((sum, s) => sum + s.items.length, 0))),
  };
}

export interface OptimizeItem {
  description: string;
}

export interface OptimizeSection {
  name: string;
  items: OptimizeItem[];
}

export interface OptimizeDryRunResult {
  sections: OptimizeSection[];
  totalOptimizations: number;
}

export function parseOptimizeDryRun(stdout: string): OptimizeDryRunResult {
  const text = stripAnsi(stdout);
  const sections: OptimizeSection[] = [];
  let currentSection: OptimizeSection | null = null;

  for (const line of text.split("\n")) {
    const trimmed = line.trim();

    const sectionMatch = trimmed.match(/^➤\s+(.+)$/);
    if (sectionMatch) {
      if (currentSection && currentSection.items.length > 0) {
        sections.push(currentSection);
      }
      currentSection = { name: sectionMatch[1], items: [] };
      continue;
    }

    if (currentSection && (trimmed.startsWith("\u2192") || trimmed.startsWith("→"))) {
      const desc = trimmed.replace(/^[→\u2192]\s*/, "").trim();
      if (desc) {
        currentSection.items.push({ description: desc });
      }
    }
  }

  if (currentSection && currentSection.items.length > 0) {
    sections.push(currentSection);
  }

  const totalMatch = text.match(/Would apply\s+(\d+)\s+optimizations/);

  return {
    sections,
    totalOptimizations: parseInt(totalMatch?.[1] || String(sections.reduce((sum, s) => sum + s.items.length, 0))),
  };
}

export interface PurgeItem {
  path: string;
  projectName: string;
  artifactType: string;
  size: string;
  sizeBytes: number;
  daysOld: number;
  ageLabel: string;
}

export interface PurgeDryRunResult {
  items: PurgeItem[];
  totalSpace: string;
  totalItems: number;
}

export function parsePurgeDryRun(stdout: string): PurgeDryRunResult {
  const text = stripAnsi(stdout);
  const items: PurgeItem[] = [];

  const lineRegex = /\[DRY RUN\] Would remove:\s+\*\s+(.+?),\s+([\d.]+\s*\w+),\s+(\d+)\s+days?\s+old/;

  for (const line of text.split("\n")) {
    const match = line.match(lineRegex);
    if (!match) continue;

    const fullPath = match[1].trim();
    const size = match[2];
    const daysOld = parseInt(match[3]);

    const parts = fullPath.split("/");
    const artifactType = parts[parts.length - 1];
    const projectName = parts[parts.length - 2];

    items.push({
      path: fullPath,
      projectName,
      artifactType,
      size,
      sizeBytes: parseSizeString(size),
      daysOld,
      ageLabel: daysOld === 1 ? "1 day ago" : `${daysOld} days ago`,
    });
  }

  items.sort((a, b) => b.sizeBytes - a.sizeBytes);

  const totalMatch = text.match(/Would free:\s*([\d.]+\s*\w+)/);
  const itemsMatch = text.match(/Items:\s*(\d+)/);

  return {
    items,
    totalSpace: totalMatch?.[1] || formatBytes(items.reduce((sum, i) => sum + i.sizeBytes, 0)),
    totalItems: parseInt(itemsMatch?.[1] || String(items.length)),
  };
}
