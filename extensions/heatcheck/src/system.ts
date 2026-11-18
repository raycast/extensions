import os from "node:os";
import { execa } from "execa";
import { ChecksumMismatchError, ensureISmc } from "./ismc";

// Re-exported so the commands keep a single import boundary (the data layer)
// while still being able to recognise a tampered-binary failure.
export { ChecksumMismatchError };

// Every measurement shell-out is bounded so one wedged process can't hang a
// snapshot (the heat-check view collects on a 4s loop). A timeout makes execa
// reject; getMemoryPressure/getPowerState/getSensorData already degrade in their
// own catch, so a slow sensor reads as "unavailable" rather than freezing.
const CMD_TIMEOUT_MS = 5000;

// Ordered by severity: cool < busy < warm < hot. Heat outranks compute — a
// machine working hard but staying cool ("busy") is calmer than one whose fans
// are climbing ("warm"), which is what a user actually notices and asks about.
export type VerdictLevel = "cool" | "busy" | "warm" | "hot";
export type MemoryPressure = "normal" | "warning" | "critical" | "unknown";
export type PowerSource = "ac" | "battery" | "unknown";

export interface ProcessStat {
  pid: number;
  name: string;
  cpu: number; // percent of total CPU capacity (0–100), normalized across cores
  memMB: number;
}

// One physical fan: current speed paired with its own rated ceiling, so each
// fan's effort is a share of its own max (the two fans have different maxima).
export interface FanReading {
  rpm: number;
  maxRpm: number;
}

// The temperatures worth showing. cpuMaxC drives the verdict (hottest CPU
// sensor); the rest are for display and AI context. Any can be null on a chip
// whose sensors we do not recognise — the UI hides null rows.
export interface TempReadings {
  cpuMaxC: number | null; // hottest CPU sensor — the verdict's thermal input
  cpuAvgC: number | null; // CPU Die Average
  gpuC: number | null;
  ssdC: number | null;
  batteryC: number | null;
}

// What is actually driving the heat right now. The headline is generated from
// this, so it can never blame a process that is not using meaningful CPU.
export type HeatCause =
  | { kind: "cpu"; process: ProcessStat } // one process is a real hog
  | { kind: "busy" } // high total load, no single culprit
  | { kind: "charging" } // warm while charging, little compute
  | { kind: "ambient" } // hot with no load — hot room, blocked vents, past spike
  | { kind: "none" }; // nothing notable

// Everything we measure. No judgement lives here — that is buildVerdict's job.
export interface SystemSnapshot {
  temps: TempReadings;
  fans: FanReading[]; // one entry per physical fan; empty when none/unavailable
  loadPct: number; // machine-wide 1-min load as % of cores (0–100)
  coreCount: number;
  powerSource: PowerSource;
  isCharging: boolean;
  memoryPressure: MemoryPressure;
  topProcesses: ProcessStat[];
  sensorsAvailable: boolean;
}

export interface Verdict {
  level: VerdictLevel;
  cause: HeatCause;
  headline: string;
  detail: string;
}

// ps gives a fast point-in-time snapshot (~100ms vs ~2s for top -l 2).
// -A all processes, -o custom columns, = suffix suppresses headers, -r sort by CPU desc.
// args= last so variable-length paths do not break column parsing
async function getTopProcesses(coreCount: number): Promise<ProcessStat[]> {
  const { stdout } = await execa("ps", ["-Ao", "pid=,pcpu=,rss=,args=", "-r"], {
    timeout: CMD_TIMEOUT_MS,
  });

  // ps pcpu sums across logical cores, so it tops out at cores×100% (e.g. 1000%
  // on a 10-core Mac). Divide by core count to express each process as a share
  // of total machine capacity — a single 0–100% scale the gauges expect.
  return stdout
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(/\s+/);
      const pid = parseInt(parts[0], 10);
      const rawCpu = parseFloat(parts[1] ?? "0");
      const rssKB = parseInt(parts[2] ?? "0", 10);
      const args = parts.slice(3).join(" ");
      // args = executable path + flags; first " -" marks start of flags
      const flagIdx = args.indexOf(" -");
      const exePath = flagIdx > 0 ? args.slice(0, flagIdx).trim() : args;
      const name = exePath.split("/").pop() ?? "unknown";
      return {
        pid,
        name,
        cpu: rawCpu / coreCount,
        memMB: Math.round(rssKB / 1024),
      };
    })
    .filter((p) => !isNaN(p.pid) && p.cpu > 0)
    .slice(0, 12);
}

async function getMemoryPressure(): Promise<MemoryPressure> {
  try {
    const { stdout } = await execa("memory_pressure", {
      timeout: CMD_TIMEOUT_MS,
    });
    const lower = stdout.toLowerCase();
    if (lower.includes("critical")) return "critical";
    if (lower.includes("warn")) return "warning";
    return "normal";
  } catch {
    return "unknown";
  }
}

// pmset -g ps prints the active source and per-battery charge state, e.g.
// "Now drawing from 'AC Power'" / "...; charging" / "...; not charging".
async function getPowerState(): Promise<{
  powerSource: PowerSource;
  isCharging: boolean;
}> {
  try {
    const { stdout } = await execa("pmset", ["-g", "ps"], {
      timeout: CMD_TIMEOUT_MS,
    });
    const powerSource: PowerSource = /AC Power/.test(stdout)
      ? "ac"
      : /Battery Power/.test(stdout)
        ? "battery"
        : "unknown";
    // match "; charging" but not "; not charging"
    const isCharging = /(?<!not )\bcharging\b/i.test(stdout);
    return { powerSource, isCharging };
  } catch {
    return { powerSource: "unknown", isCharging: false };
  }
}

// iSMC `temp`/`fans -o json` emit a flat map of friendly sensor name → reading.
// Float-typed sensors (every temp and fan we care about) carry a parsed numeric
// `quantity` and a `unit` ("°C", "rpm"); we read those rather than the raw value.
interface ISmcReading {
  key?: string;
  type?: string;
  value?: string;
  quantity?: number;
  unit?: string;
}
type ISmcReadout = Record<string, ISmcReading>;

function parseFans(fans: ISmcReadout): FanReading[] {
  // Each fan reports four readings (actual/max/min/target) keyed F<n>Ac/Mx/Mn/Tg.
  // Group by fan index <n> and pair current speed (Ac) with rated max (Mx) so
  // each fan's effort is a share of its own ceiling — the fans differ.
  const byIndex = new Map<number, { rpm?: number; maxRpm?: number }>();
  for (const r of Object.values(fans)) {
    const m = typeof r.key === "string" ? /^F(\d+)(Ac|Mx)$/.exec(r.key) : null;
    if (!m || typeof r.quantity !== "number" || r.quantity <= 0) continue;
    const idx = parseInt(m[1], 10);
    const entry = byIndex.get(idx) ?? {};
    if (m[2] === "Ac") entry.rpm = r.quantity;
    else entry.maxRpm = r.quantity;
    byIndex.set(idx, entry);
  }
  return [...byIndex.entries()]
    .sort(([a], [b]) => a - b)
    .filter((e): e is [number, { rpm: number; maxRpm: number }] => {
      const [, v] = e;
      return typeof v.rpm === "number" && typeof v.maxRpm === "number";
    })
    .map(([, v]) => ({ rpm: v.rpm, maxRpm: v.maxRpm }));
}

// There is no single canonical "CPU temperature" sensor, so we tier by
// reliability. Both Intel SMC and Apple Silicon expose sensors iSMC decodes with
// a "CPU …" name prefix (CPU Diode/Core/Package on Intel; CPU Die/Performance/
// Efficiency on Apple Silicon) — prefer the hottest of those. Failing that, fall
// back to Apple Silicon PMU die sensors (tdie), then to the hottest plausible
// sensor overall, so an uncatalogued chip still yields a sane number, not null.
function parseCpuTempC(temps: ISmcReadout): number | null {
  const sensors = Object.entries(temps)
    .filter(([, r]) => r.unit === "°C" && typeof r.quantity === "number")
    .map(([name, r]) => ({ name, c: r.quantity as number }))
    .filter((s) => s.c > 0 && s.c < 130); // drop implausible / raw sp78 readings
  if (sensors.length === 0) return null;

  const hottest = (pool: { c: number }[]) =>
    pool.length > 0 ? Math.max(...pool.map((s) => s.c)) : null;

  return (
    hottest(sensors.filter((s) => /^cpu\b/i.test(s.name))) ??
    hottest(sensors.filter((s) => /\btdie\d*\b/i.test(s.name))) ??
    hottest(sensors)
  );
}

// Hottest °C sensor whose friendly name matches `re`. iSMC exposes many probes
// per component (GPU 1…21, SSD 2…8, Battery 1…3); the hottest is the meaningful
// one to surface. Names are Apple Silicon conventions — an unrecognised chip
// yields null and the row is hidden rather than guessed.
function hottestNamed(temps: ISmcReadout, re: RegExp): number | null {
  const vals = Object.entries(temps)
    .filter(
      ([name, r]) =>
        r.unit === "°C" &&
        typeof r.quantity === "number" &&
        r.quantity > 0 &&
        r.quantity < 130 &&
        re.test(name),
    )
    .map(([, r]) => r.quantity as number);
  return vals.length > 0 ? Math.max(...vals) : null;
}

function parseTemps(temps: ISmcReadout): TempReadings {
  return {
    cpuMaxC: parseCpuTempC(temps),
    cpuAvgC: hottestNamed(temps, /^cpu die average$/i),
    gpuC: hottestNamed(temps, /^gpu \d+$/i), // core probes, not fabric/heatsink
    ssdC: hottestNamed(temps, /^ssd \d+$/i), // not "SSD Proximity"/"Controller"
    batteryC: hottestNamed(temps, /^battery \d+$/i),
  };
}

const NO_TEMPS: TempReadings = {
  cpuMaxC: null,
  cpuAvgC: null,
  gpuC: null,
  ssdC: null,
  batteryC: null,
};

async function getSensorData(): Promise<{
  temps: TempReadings;
  fans: FanReading[];
  sensorsAvailable: boolean;
}> {
  try {
    const bin = await ensureISmc();
    const [tempRes, fanRes] = await Promise.all([
      execa(bin, ["temp", "-o", "json"], { timeout: CMD_TIMEOUT_MS }),
      execa(bin, ["fans", "-o", "json"], { timeout: CMD_TIMEOUT_MS }),
    ]);
    const temps = JSON.parse(tempRes.stdout) as ISmcReadout;
    const fans = JSON.parse(fanRes.stdout) as ISmcReadout;
    return {
      temps: parseTemps(temps),
      fans: parseFans(fans),
      sensorsAvailable: true,
    };
  } catch (err) {
    // A checksum mismatch is a security event, not graceful-degradation
    // territory — propagate it so the command can alarm distinctly.
    if (err instanceof ChecksumMismatchError) throw err;
    // Expected degraded mode: offline on first run (binary not yet cached) or
    // sensors unreadable. The UI surfaces this via sensorsAvailable; not silent.
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[iSMC] sensor read failed: <${message}>`);
    return { temps: NO_TEMPS, fans: [], sensorsAvailable: false };
  }
}

export async function collectSnapshot(): Promise<SystemSnapshot> {
  const coreCount = os.cpus().length || 1;
  const [processes, memoryPressure, sensors, power] = await Promise.all([
    getTopProcesses(coreCount),
    getMemoryPressure(),
    getSensorData(),
    getPowerState(),
  ]);

  // loadavg[0] is the 1-min run-queue length; as a fraction of cores it reads as
  // machine-wide utilisation. Clamp at 100 — contention can push it past cores.
  const loadPct = Math.min(100, (os.loadavg()[0] / coreCount) * 100);

  return {
    temps: sensors.temps,
    fans: sensors.fans,
    loadPct,
    coreCount,
    powerSource: power.powerSource,
    isCharging: power.isCharging,
    memoryPressure,
    topProcesses: processes,
    sensorsAvailable: sensors.sensorsAvailable,
  };
}

// A single fan's effort as a share of its own rated max.
export function fanEffortPct(fan: FanReading): number {
  return Math.min(100, (fan.rpm / fan.maxRpm) * 100);
}

// The hardest-working fan's effort — the verdict's cooling input.
export function fanLoadPct(snap: SystemSnapshot): number | null {
  if (snap.fans.length === 0) return null;
  return Math.max(...snap.fans.map(fanEffortPct));
}

// A process counts as a hog at 60% of the whole machine; total load reads "busy"
// at half the machine. Cooling is read on two bands: "warm" once the fan passes
// 70% of its rated max or the die clears 85°C, "stressed" at 85% / 95°C (high
// even for Apple Silicon). The warm band gives the verdict a step between cool
// and hot instead of snapping straight across.
const HOG_PCT = 60;
const BUSY_LOAD_PCT = 50;
const FAN_WARM_PCT = 70;
const FAN_STRESS_PCT = 85;
const WARM_TEMP_C = 85;
const HOT_TEMP_C = 95;

type ThermalState = "none" | "warm" | "hot";

export function buildVerdict(snap: SystemSnapshot): Verdict {
  const top = snap.topProcesses[0];
  const fanPct = fanLoadPct(snap);
  const temp = snap.temps.cpuMaxC;
  const hog = top && top.cpu >= HOG_PCT ? top : null;
  const busy = snap.loadPct >= BUSY_LOAD_PCT;

  const thermal: ThermalState =
    (fanPct != null && fanPct >= FAN_STRESS_PCT) ||
    (temp != null && temp >= HOT_TEMP_C)
      ? "hot"
      : (fanPct != null && fanPct >= FAN_WARM_PCT) ||
          (temp != null && temp >= WARM_TEMP_C)
        ? "warm"
        : "none";

  // Heat outranks compute: surface a climbing fan over a cool-but-busy machine.
  const level: VerdictLevel =
    thermal === "hot"
      ? "hot"
      : thermal === "warm"
        ? "warm"
        : hog || busy
          ? "busy"
          : "cool";

  // Name the actionable compute driver first; otherwise explain the heat.
  let cause: HeatCause;
  if (hog) cause = { kind: "cpu", process: hog };
  else if (busy) cause = { kind: "busy" };
  else if (thermal !== "none" && snap.isCharging) cause = { kind: "charging" };
  else if (thermal !== "none") cause = { kind: "ambient" };
  else cause = { kind: "none" };

  return {
    level,
    cause,
    headline: headlineFor(cause, snap, thermal),
    detail: detailLine(snap),
  };
}

function headlineFor(
  cause: HeatCause,
  snap: SystemSnapshot,
  thermal: ThermalState,
): string {
  switch (cause.kind) {
    case "cpu":
      return `${cause.process.name} is overloading your CPU (${cause.process.cpu.toFixed(0)}%)`;
    case "busy":
      return `Working hard, load spread across processes (${snap.loadPct.toFixed(0)}%)`;
    case "charging":
      return "Warm from charging, CPU is quiet";
    case "ambient":
      return thermal === "hot"
        ? "Running hot, but nothing is hammering the CPU"
        : "Warming up, but nothing is hammering the CPU";
    case "none":
      return "Running cool";
  }
}

function detailLine(snap: SystemSnapshot): string {
  const fanPct = fanLoadPct(snap);
  return [
    snap.temps.cpuMaxC != null ? `${snap.temps.cpuMaxC.toFixed(0)}°C` : null,
    fanPct != null ? `fan ${fanPct.toFixed(0)}%` : null,
    snap.isCharging
      ? "charging"
      : snap.powerSource === "ac"
        ? "on AC"
        : snap.powerSource === "battery"
          ? "on battery"
          : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function formatStatsForAI(
  snap: SystemSnapshot,
  verdict: Verdict,
): string {
  const t = snap.temps;
  const tempParts = [
    t.cpuMaxC != null ? `CPU ${t.cpuMaxC.toFixed(0)}°C max` : null,
    t.cpuAvgC != null ? `${t.cpuAvgC.toFixed(0)}°C avg` : null,
    t.gpuC != null ? `GPU ${t.gpuC.toFixed(0)}°C` : null,
    t.ssdC != null ? `SSD ${t.ssdC.toFixed(0)}°C` : null,
    t.batteryC != null ? `battery ${t.batteryC.toFixed(0)}°C` : null,
  ].filter(Boolean);
  const fanLine =
    snap.fans.length > 0
      ? snap.fans
          .map(
            (f, i) =>
              `fan ${i + 1} ${f.rpm} RPM (${fanEffortPct(f).toFixed(0)}% of max)`,
          )
          .join(", ")
      : "unavailable";

  const lines: string[] = [
    `Verdict: ${verdict.level} — ${verdict.headline}`,
    `Temperatures: ${tempParts.length > 0 ? tempParts.join(", ") : "unavailable"} (Apple Silicon runs 90–100°C under load by design; high temp alone is not a problem)`,
    `Fans: ${fanLine}`,
    `Total CPU load: ${snap.loadPct.toFixed(0)}% across ${snap.coreCount} cores`,
    `Power: ${snap.powerSource}${snap.isCharging ? ", charging" : ""}`,
    `Memory pressure: ${snap.memoryPressure}`,
    "",
    "Top processes (% of total machine CPU capacity, 0–100):",
    ...snap.topProcesses
      .slice(0, 8)
      .map(
        (p) =>
          `  ${p.name} (PID ${p.pid}): ${p.cpu.toFixed(1)}% CPU, ${p.memMB} MB RAM`,
      ),
  ];
  return lines.join("\n");
}

export function formatStatsForDisplay(snap: SystemSnapshot): string {
  const fmtCpu = (n: number) => `${n.toFixed(1)}%`;
  const fmtMem = (mb: number) =>
    mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb} MB`;
  const fmtTemp = (c: number | null) =>
    c != null ? `${c.toFixed(1)}°C` : null;
  const t = snap.temps;

  const cpuTemp =
    t.cpuMaxC != null
      ? `${t.cpuMaxC.toFixed(1)}°C max${t.cpuAvgC != null ? ` · ${t.cpuAvgC.toFixed(1)}°C avg` : ""}`
      : "unavailable";

  const tempRows = [
    `| CPU | ${cpuTemp} |`,
    fmtTemp(t.gpuC) ? `| GPU | ${fmtTemp(t.gpuC)} |` : null,
    fmtTemp(t.ssdC) ? `| SSD | ${fmtTemp(t.ssdC)} |` : null,
    fmtTemp(t.batteryC) ? `| Battery | ${fmtTemp(t.batteryC)} |` : null,
  ].filter(Boolean);

  const fanRows =
    snap.fans.length > 0
      ? snap.fans.map(
          (f, i) =>
            `| Fan ${i + 1} | ${f.rpm.toLocaleString()} RPM (${fanEffortPct(f).toFixed(0)}%) |`,
        )
      : [`| Fan | unavailable |`];

  const top = snap.topProcesses.slice(0, 6);

  return [
    `| Metric | Value |`,
    `| --- | --- |`,
    ...tempRows,
    ...fanRows,
    `| CPU load | ${snap.loadPct.toFixed(0)}% of ${snap.coreCount} cores |`,
    `| Power | ${snap.powerSource}${snap.isCharging ? ", charging" : ""} |`,
    `| Memory pressure | ${snap.memoryPressure} |`,
    ``,
    `### Top Processes`,
    ``,
    `| Process | CPU | Memory |`,
    `| --- | ---: | ---: |`,
    ...top.map((p) => `| ${p.name} | ${fmtCpu(p.cpu)} | ${fmtMem(p.memMB)} |`),
  ].join("\n");
}
