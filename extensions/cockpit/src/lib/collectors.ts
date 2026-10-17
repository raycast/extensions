import { LocalStorage } from "@raycast/api";
import { execFile, spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { homedir, uptime } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import type {
  BatteryMetric,
  ClaudeMetric,
  CodexLimit,
  CodexMetric,
  CpuMetric,
  DiskMetric,
  MemoryMetric,
  ModuleKey,
  ModulePreferences,
  NetworkMetric,
  RateLimitWindow,
  StatusSnapshot,
  UptimeMetric,
} from "./types";
import { clampPercent } from "./format";

const execFileAsync = promisify(execFile);
const NETWORK_SAMPLE_KEY = "cockpit.network-sample.v1";
const CODEX_CACHE_KEY = "cockpit.codex-cache.v1";
const CODEX_CACHE_MS = 60_000;

interface NetworkSample {
  interfaceName: string;
  receivedBytes: number;
  sentBytes: number;
  timestamp: number;
}

interface CachedCodex {
  timestamp: number;
  metric: CodexMetric;
}

interface RawRateLimitWindow {
  usedPercent: number;
  windowDurationMins?: number | null;
  resetsAt?: number | null;
}

interface RawRateLimit {
  limitId?: string | null;
  limitName?: string | null;
  planType?: string | null;
  primary?: RawRateLimitWindow | null;
  secondary?: RawRateLimitWindow | null;
}

interface RawRateLimitResponse {
  rateLimits?: RawRateLimit;
  rateLimitsByLimitId?: Record<string, RawRateLimit> | null;
}

interface RawClaudeUsageSample {
  t?: number;
  u?: {
    fh?: number;
    sd?: number;
  };
}

interface RawClaudeUsageHistory {
  samples?: RawClaudeUsageSample[];
}

async function run(file: string, args: string[], timeout = 5_000): Promise<string> {
  const { stdout } = await execFileAsync(file, args, {
    encoding: "utf8",
    timeout,
    maxBuffer: 1024 * 1024,
  });
  return stdout;
}

export async function collectCpu(): Promise<CpuMetric> {
  const output = await run("/usr/bin/top", ["-l", "1", "-n", "0", "-stats", "cpu"]);
  const match = output.match(/CPU usage:\s*([\d.]+)% user,\s*([\d.]+)% sys/i);
  if (!match) throw new Error("Could not parse CPU usage");
  return { percent: clampPercent(Number(match[1]) + Number(match[2])) };
}

export async function collectMemory(): Promise<MemoryMetric> {
  const [pressure, totalText] = await Promise.all([
    run("/usr/bin/memory_pressure", ["-Q"]),
    run("/usr/sbin/sysctl", ["-n", "hw.memsize"]),
  ]);
  const match = pressure.match(/System-wide memory free percentage:\s*(\d+)%/i);
  if (!match) throw new Error("Could not parse memory pressure");
  const totalBytes = Number(totalText.trim());
  const percent = clampPercent(100 - Number(match[1]));
  return { percent, totalBytes, usedBytes: Math.round((totalBytes * percent) / 100) };
}

export async function collectDisk(volume: string): Promise<DiskMetric> {
  const target = expandHomePath(volume.trim() || "/");
  const output = await run("/bin/df", ["-k", target]);
  const lines = output.trim().split("\n");
  const fields = lines.at(-1)?.trim().split(/\s+/);
  if (!fields || fields.length < 5) throw new Error(`Could not parse disk usage for ${target}`);
  const totalBytes = Number(fields[1]) * 1024;
  const usedBytes = Number(fields[2]) * 1024;
  const availableBytes = Number(fields[3]) * 1024;
  const percent = clampPercent(Number(fields[4].replace("%", "")));
  return { percent, totalBytes, usedBytes, availableBytes };
}

export async function collectUptime(): Promise<UptimeMetric> {
  return { seconds: Math.max(0, Math.floor(uptime())) };
}

async function resolveNetworkInterface(preferred: string): Promise<string> {
  const override = preferred.trim();
  if (override) return override;
  const output = await run("/sbin/route", ["-n", "get", "default"]);
  const match = output.match(/interface:\s*(\S+)/);
  if (!match) throw new Error("No default network interface");
  return match[1];
}

async function networkCounters(interfaceName: string): Promise<{ receivedBytes: number; sentBytes: number }> {
  const output = await run("/usr/sbin/netstat", ["-ibn", "-I", interfaceName]);
  const lines = output.trim().split("\n").filter(Boolean);
  const headerIndex = lines.findIndex((line) => /\bIbytes\b/.test(line) && /\bObytes\b/.test(line));
  if (headerIndex < 0) throw new Error("Could not find network counters");

  const header = lines[headerIndex].trim().split(/\s+/);
  const inputIndex = header.indexOf("Ibytes");
  const outputIndex = header.indexOf("Obytes");
  let receivedBytes = 0;
  let sentBytes = 0;

  for (const line of lines.slice(headerIndex + 1)) {
    const fields = line.trim().split(/\s+/);
    if (fields[0] !== interfaceName) continue;
    const incoming = Number(fields[inputIndex]);
    const outgoing = Number(fields[outputIndex]);
    if (Number.isFinite(incoming)) receivedBytes = Math.max(receivedBytes, incoming);
    if (Number.isFinite(outgoing)) sentBytes = Math.max(sentBytes, outgoing);
  }

  if (receivedBytes === 0 && sentBytes === 0) throw new Error("Network counters are unavailable");
  return { receivedBytes, sentBytes };
}

export async function collectNetwork(preferredInterface: string): Promise<NetworkMetric> {
  const interfaceName = await resolveNetworkInterface(preferredInterface);
  const counters = await networkCounters(interfaceName);
  const timestamp = Date.now();
  const previousText = await LocalStorage.getItem<string>(NETWORK_SAMPLE_KEY);
  const current: NetworkSample = { interfaceName, ...counters, timestamp };
  await LocalStorage.setItem(NETWORK_SAMPLE_KEY, JSON.stringify(current));

  if (!previousText) {
    return {
      interfaceName,
      downloadBytesPerSecond: 0,
      uploadBytesPerSecond: 0,
      totalReceivedBytes: counters.receivedBytes,
      totalSentBytes: counters.sentBytes,
      ready: false,
    };
  }

  try {
    const previous = JSON.parse(previousText) as NetworkSample;
    const elapsedSeconds = (timestamp - previous.timestamp) / 1000;
    if (previous.interfaceName !== interfaceName || elapsedSeconds <= 0 || elapsedSeconds > 180) {
      return {
        interfaceName,
        downloadBytesPerSecond: 0,
        uploadBytesPerSecond: 0,
        totalReceivedBytes: counters.receivedBytes,
        totalSentBytes: counters.sentBytes,
        ready: false,
      };
    }
    return {
      interfaceName,
      downloadBytesPerSecond: Math.max(0, (current.receivedBytes - previous.receivedBytes) / elapsedSeconds),
      uploadBytesPerSecond: Math.max(0, (current.sentBytes - previous.sentBytes) / elapsedSeconds),
      totalReceivedBytes: counters.receivedBytes,
      totalSentBytes: counters.sentBytes,
      ready: true,
    };
  } catch {
    return {
      interfaceName,
      downloadBytesPerSecond: 0,
      uploadBytesPerSecond: 0,
      totalReceivedBytes: counters.receivedBytes,
      totalSentBytes: counters.sentBytes,
      ready: false,
    };
  }
}

export async function collectBattery(): Promise<BatteryMetric> {
  const output = await run("/usr/bin/pmset", ["-g", "batt"]);
  const percentMatch = output.match(/(\d+)%/);
  if (!percentMatch) throw new Error("No battery detected");
  const normalized = output.toLowerCase();
  const state: BatteryMetric["state"] = normalized.includes("discharging")
    ? "discharging"
    : normalized.includes("charged")
      ? "charged"
      : normalized.includes("charging") || normalized.includes("ac attached")
        ? "charging"
        : "unknown";
  const timeMatch = output.match(/(\d+:\d+) remaining/i);
  return {
    percent: clampPercent(Number(percentMatch[1])),
    state,
    timeRemaining: state === "discharging" ? timeMatch?.[1] : undefined,
  };
}

function normalizeWindow(window?: RawRateLimitWindow | null): RateLimitWindow | null {
  if (!window) return null;
  return {
    usedPercent: clampPercent(window.usedPercent),
    windowDurationMins: window.windowDurationMins ?? null,
    resetsAt: window.resetsAt ?? null,
  };
}

function normalizeCodexResponse(response: RawRateLimitResponse): CodexMetric {
  const rawLimits = response.rateLimitsByLimitId
    ? Object.entries(response.rateLimitsByLimitId)
    : response.rateLimits
      ? [[response.rateLimits.limitId ?? "codex", response.rateLimits] as const]
      : [];
  const seen = new Set<string>();
  const limits: CodexLimit[] = [];

  for (const [fallbackId, raw] of rawLimits) {
    const id = raw.limitId ?? fallbackId;
    if (seen.has(id)) continue;
    seen.add(id);
    limits.push({
      id,
      name: raw.limitName || (id === "codex" ? "Codex" : id),
      planType: raw.planType,
      primary: normalizeWindow(raw.primary),
      secondary: normalizeWindow(raw.secondary),
    });
  }

  limits.sort((a, b) => (a.id === "codex" ? -1 : b.id === "codex" ? 1 : a.name.localeCompare(b.name)));
  if (limits.length === 0) throw new Error("No Codex usage windows returned");
  return { limits };
}

// A bare command name is resolved from PATH below, so Homebrew, /usr/local, npm, and
// custom installs all work without the user having to find the binary first.
function resolveCodexCommand(codexPath: string): string {
  const configured = codexPath.trim();
  if (!configured) return "codex";
  return expandHomePath(configured);
}

async function requestCodexRateLimits(codexPath: string): Promise<CodexMetric> {
  const command = resolveCodexCommand(codexPath);
  return await new Promise<CodexMetric>((resolve, reject) => {
    const child = spawn(command, ["app-server", "--stdio"], {
      stdio: ["pipe", "pipe", "pipe"],
      env: {
        ...process.env,
        PATH: `/opt/homebrew/bin:/usr/local/bin:${process.env.PATH ?? ""}`,
      },
    });
    let stdout = "";
    let stderr = "";
    let settled = false;

    const finish = (error?: Error, metric?: CodexMetric) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      child.kill();
      if (error) reject(error);
      else if (metric) resolve(metric);
      else reject(new Error("Codex returned no usage data"));
    };

    const send = (message: unknown) => child.stdin.write(`${JSON.stringify(message)}\n`);
    const timer = setTimeout(() => finish(new Error("Codex usage request timed out")), 12_000);

    child.on("error", (error) =>
      finish(
        (error as NodeJS.ErrnoException).code === "ENOENT"
          ? new Error(`Codex CLI not found at "${command}". Set the Codex CLI Path in extension settings.`)
          : error,
      ),
    );
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
      const lines = stdout.split("\n");
      stdout = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const message = JSON.parse(line) as {
            id?: number;
            result?: RawRateLimitResponse;
            error?: { message?: string };
          };
          if (message.id === 1) {
            send({ method: "initialized" });
            send({ id: 2, method: "account/rateLimits/read", params: null });
          } else if (message.id === 2 && message.result) {
            finish(undefined, normalizeCodexResponse(message.result));
          } else if (message.id === 2 && message.error) {
            finish(new Error(message.error.message || "Codex usage request failed"));
          }
        } catch {
          // Ignore non-JSON diagnostics and unrelated notifications.
        }
      }
    });
    child.on("exit", (code) => {
      if (!settled) finish(new Error(stderr.trim() || `Codex exited with status ${code ?? "unknown"}`));
    });

    send({
      id: 1,
      method: "initialize",
      params: {
        clientInfo: { name: "cockpit", version: "0.1.0" },
        capabilities: { experimentalApi: true },
      },
    });
  });
}

export async function collectCodex(codexPath: string, force = false): Promise<CodexMetric> {
  const cachedText = await LocalStorage.getItem<string>(CODEX_CACHE_KEY);
  if (!force && cachedText) {
    try {
      const cached = JSON.parse(cachedText) as CachedCodex;
      if (Date.now() - cached.timestamp < CODEX_CACHE_MS) return cached.metric;
    } catch {
      // Replace malformed or stale cache below.
    }
  }

  const metric = await requestCodexRateLimits(codexPath);
  await LocalStorage.setItem(CODEX_CACHE_KEY, JSON.stringify({ timestamp: Date.now(), metric } satisfies CachedCodex));
  return metric;
}

function expandHomePath(filePath: string): string {
  if (filePath === "~") return homedir();
  if (filePath.startsWith("~/")) return join(homedir(), filePath.slice(2));
  return filePath;
}

export async function collectClaude(usagePath: string): Promise<ClaudeMetric> {
  const raw = JSON.parse(await readFile(expandHomePath(usagePath), "utf8")) as RawClaudeUsageHistory;
  const sample = raw.samples
    ?.filter((candidate) => Number.isFinite(candidate.t) && candidate.u)
    .sort((a, b) => (b.t ?? 0) - (a.t ?? 0))[0];

  if (!sample?.u || !sample.t) throw new Error("No Claude usage samples found");

  const windows: ClaudeMetric["windows"] = [];
  if (Number.isFinite(sample.u.fh)) {
    windows.push({ id: "five-hour", name: "5-hour", usedPercent: clampPercent(sample.u.fh!) });
  }
  if (Number.isFinite(sample.u.sd)) {
    windows.push({ id: "weekly", name: "Weekly", usedPercent: clampPercent(sample.u.sd!) });
  }
  if (windows.length === 0) throw new Error("Claude usage sample has no rate-limit windows");

  return { updatedAt: sample.t, windows };
}

async function capture<T>(
  key: ModuleKey,
  enabled: boolean,
  collector: () => Promise<T>,
  assign: (value: T) => void,
  errors: StatusSnapshot["errors"],
): Promise<void> {
  if (!enabled) return;
  try {
    assign(await collector());
  } catch (error) {
    errors[key] = error instanceof Error ? error.message : String(error);
  }
}

export async function collectSnapshot(preferences: ModulePreferences, forceCodex = false): Promise<StatusSnapshot> {
  const snapshot: StatusSnapshot = { updatedAt: Date.now(), errors: {} };
  await Promise.all([
    capture("cpu", preferences.showCpu, collectCpu, (value) => (snapshot.cpu = value), snapshot.errors),
    capture("memory", preferences.showMemory, collectMemory, (value) => (snapshot.memory = value), snapshot.errors),
    capture(
      "disk",
      preferences.showDisk,
      () => collectDisk(preferences.diskVolume),
      (value) => (snapshot.disk = value),
      snapshot.errors,
    ),
    capture("uptime", preferences.showUptime, collectUptime, (value) => (snapshot.uptime = value), snapshot.errors),
    capture(
      "network",
      preferences.showNetwork,
      () => collectNetwork(preferences.networkInterface),
      (value) => (snapshot.network = value),
      snapshot.errors,
    ),
    capture("battery", preferences.showBattery, collectBattery, (value) => (snapshot.battery = value), snapshot.errors),
    capture(
      "codex",
      preferences.showCodex,
      () => collectCodex(preferences.codexPath, forceCodex),
      (value) => (snapshot.codex = value),
      snapshot.errors,
    ),
    capture(
      "claude",
      preferences.showClaude,
      () => collectClaude(preferences.claudeUsagePath),
      (value) => (snapshot.claude = value),
      snapshot.errors,
    ),
  ]);
  snapshot.updatedAt = Date.now();
  return snapshot;
}
