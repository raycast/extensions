export interface ProcessRow {
  pid: number;
  ppid: number;
  uid: number;
  start: string;
  executable: string;
  name: string;
  memory: number | null;
  cpuNs: number | null;
  readBytes: number | null;
  writeBytes: number | null;
  appPath?: string;
  appName?: string;
  bundleId?: string;
  appPid?: number;
  blockedReason: string | null;
}
export interface ContainerRow {
  id: string;
  name: string;
  startedAt: string;
  status: string;
  stopSignal: string;
  memory: number | null;
  cpuPercent: number | null;
  readBytes: number | null;
  writeBytes: number | null;
}
export interface Snapshot {
  timestamp: number;
  awake: number;
  boot: string;
  system: {
    totalMemory: number | null;
    logicalCPUs: number | null;
    pressure: number | null;
    compressed: number | null;
    swapUsed: number | null;
  };
  processes: ProcessRow[];
  containers: ContainerRow[];
  containerError?: string;
}
export interface Entity {
  key: string;
  kind: "app" | "process" | "container";
  name: string;
  memory: number | null;
  cpuPercent: number | null;
  cpuSeconds: number | null;
  readDelta: number | null;
  writeDelta: number | null;
  observed: number;
  processes: ProcessRow[];
  target?: ProcessRow;
  container?: ContainerRow;
  blockedReason?: string;
  partialMetrics?: boolean;
}
export function processKey(p: ProcessRow, boot: string) {
  return `${boot}:${p.pid}:${p.start}`;
}
export function interval(current: Snapshot, previous?: Snapshot): number {
  if (!previous || current.boot !== previous.boot || current.boot === "unknown")
    return 0;
  const wall = current.timestamp - previous.timestamp,
    awake = current.awake - previous.awake;
  return wall > 0 && wall <= 120 && awake > 0 && Math.abs(wall - awake) < 3
    ? awake
    : 0;
}
function delta(
  now: number | null,
  old: number | null | undefined,
): number | null {
  return now != null && old != null && now >= old ? now - old : null;
}
function sumNullable(values: (number | null)[]): number | null {
  // A partial group total would look reassuringly precise. Keep unavailable totals explicit.
  return values.length && values.every((v) => v !== null)
    ? values.reduce<number>((a, b) => a + b!, 0)
    : null;
}
function sumKnown(values: (number | null)[]): number | null {
  const known = values.filter((v): v is number => v !== null);
  return known.length ? known.reduce((a, b) => a + b, 0) : null;
}
export function entities(current: Snapshot, previous?: Snapshot): Entity[] {
  const seconds = interval(current, previous);
  const old = new Map(
    previous?.processes.map((p) => [processKey(p, previous.boot), p]),
  );
  const rows: Entity[] = current.processes.map((p) => {
    const before = old.get(processKey(p, current.boot));
    const [startSeconds, startMicros] = p.start.split(":").map(Number);
    const born = startSeconds + startMicros / 1e6;
    const startedDuringInterval =
      !!previous && born >= previous.timestamp && born <= current.timestamp;
    const baseline =
      before ??
      (startedDuringInterval
        ? { cpuNs: 0, readBytes: 0, writeBytes: 0 }
        : undefined);
    const cpu = seconds ? delta(p.cpuNs, baseline?.cpuNs) : null;
    return {
      key: `process:${processKey(p, current.boot)}`,
      kind: "process",
      name: p.name,
      memory: p.memory,
      cpuSeconds: cpu == null ? null : cpu / 1e9,
      cpuPercent: cpu == null ? null : (cpu / 1e9 / seconds) * 100,
      readDelta: seconds ? delta(p.readBytes, baseline?.readBytes) : null,
      writeDelta: seconds ? delta(p.writeBytes, baseline?.writeBytes) : null,
      observed: before
        ? seconds
        : startedDuringInterval
          ? Math.min(seconds, current.timestamp - born)
          : 0,
      processes: [p],
      target: p,
      blockedReason: p.blockedReason ?? undefined,
    };
  });
  const groups = new Map<string, Entity[]>();
  for (const row of rows) {
    const p = row.target!;
    if (!p.appPath) continue;
    const key = `app:${p.appPath}`;
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  const apps: Entity[] = [...groups].map(([key, parts]) => {
    const processes = parts.flatMap((p) => p.processes);
    const target = processes.find((p) => p.pid === p.appPid);
    const representative = target ?? processes[0];
    return {
      key,
      kind: "app",
      name: representative.appName ?? representative.name,
      memory: sumNullable(parts.map((p) => p.memory)),
      cpuSeconds: sumKnown(parts.map((p) => p.cpuSeconds)),
      cpuPercent: sumKnown(parts.map((p) => p.cpuPercent)),
      readDelta: sumKnown(parts.map((p) => p.readDelta)),
      writeDelta: sumKnown(parts.map((p) => p.writeDelta)),
      partialMetrics: parts.some(
        (p) =>
          p.cpuSeconds === null ||
          p.readDelta === null ||
          p.writeDelta === null,
      ),
      observed: Math.max(0, ...parts.map((p) => p.observed)),
      processes,
      target,
      blockedReason: target
        ? (target.blockedReason ?? undefined)
        : "Main app has exited; inspect the remaining processes individually",
    };
  });
  const previousContainers = new Map(
    previous?.containers?.map((c) => [`${c.id}:${c.startedAt}`, c]),
  );
  const containers: Entity[] = (current.containers ?? []).map((c) => {
    const before = previousContainers.get(`${c.id}:${c.startedAt}`),
      observed = before ? seconds : 0;
    return {
      key: `container:${c.id}`,
      kind: "container",
      name: c.name,
      memory: c.memory,
      cpuPercent: c.cpuPercent,
      cpuSeconds:
        observed && c.cpuPercent != null
          ? (c.cpuPercent / 100) * observed
          : null,
      readDelta: observed ? delta(c.readBytes, before?.readBytes) : null,
      writeDelta: observed ? delta(c.writeBytes, before?.writeBytes) : null,
      observed,
      processes: [],
      container: c,
    };
  });
  return [...apps, ...rows, ...containers];
}
export function bytes(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "Unavailable";
  if (value < 1024) return `${Math.round(value)} B`;
  const power = Math.min(4, Math.floor(Math.log(value) / Math.log(1024)));
  return `${(value / 1024 ** power).toFixed(1)} ${["B", "KiB", "MiB", "GiB", "TiB"][power]}`;
}
export function parseBytes(text: string): number | null {
  const m = text
    .trim()
    .match(/^([\d.]+)\s*(B|kB|KB|MB|GB|TB|KiB|MiB|GiB|TiB)$/);
  if (!m) return null;
  const suffix = m[2],
    powers: Record<string, number> = {
      B: 0,
      kB: 1,
      KB: 1,
      MB: 2,
      GB: 3,
      TB: 4,
      KiB: 1,
      MiB: 2,
      GiB: 3,
      TiB: 4,
    };
  return Number(m[1]) * (suffix.includes("i") ? 1024 : 1000) ** powers[suffix];
}
export function pressureName(value: number | null) {
  return value === 1
    ? "Normal"
    : value === 2
      ? "Warning"
      : value === 4
        ? "Critical"
        : "Unavailable";
}
export function markdownText(value: string) {
  return value.replace(/[\\`*_{}[\]<>#|]/g, "\\$&");
}
