import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

export interface UsageWindow {
  id: string;
  label: string;
  remainingPercent: number;
  resetsAt: number | null;
}

export interface ProviderUsage {
  updatedAt: number;
  windows: UsageWindow[];
}

interface RawRateLimitWindow {
  usedPercent: number;
  windowDurationMins?: number | null;
  resetsAt?: number | null;
}

interface RawRateLimit {
  limitId?: string | null;
  limitName?: string | null;
  primary?: RawRateLimitWindow | null;
  secondary?: RawRateLimitWindow | null;
}

export interface RawCodexRateLimitResponse {
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

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)));
}

function expandHomePath(filePath: string): string {
  const trimmed = filePath.trim();
  if (trimmed === "~") return homedir();
  if (trimmed.startsWith("~/")) return join(homedir(), trimmed.slice(2));
  return trimmed;
}

function formatWindowName(minutes?: number | null): string {
  if (!minutes) return "Usage";
  if (minutes <= 300) return `${Math.round(minutes / 60)}-hour`;
  if (minutes <= 1440) return "Daily";
  if (minutes <= 10080) return "Weekly";
  if (minutes <= 44640) return "Monthly";
  return `${Math.round(minutes / 1440)}-day`;
}

function shortProviderName(provider: string): string {
  return provider.replace(/^GPT-[^-]+-Codex-/i, "");
}

function isSparkLimit(id: string, name: string): boolean {
  return /spark/i.test(`${id} ${name}`);
}

export function parseCodexRateLimits(response: RawCodexRateLimitResponse, showSpark: boolean): ProviderUsage {
  const rawLimits = response.rateLimitsByLimitId
    ? Object.entries(response.rateLimitsByLimitId)
    : response.rateLimits
      ? [[response.rateLimits.limitId ?? "codex", response.rateLimits] as const]
      : [];
  const seen = new Set<string>();
  const windows: UsageWindow[] = [];

  for (const [fallbackId, limit] of rawLimits) {
    const limitId = limit.limitId ?? fallbackId;
    const limitName = limit.limitName || (limitId === "codex" ? "Codex" : limitId);
    if (seen.has(limitId) || (!showSpark && isSparkLimit(limitId, limitName))) continue;
    seen.add(limitId);

    for (const [kind, window] of [
      ["primary", limit.primary],
      ["secondary", limit.secondary],
    ] as const) {
      if (!window || !Number.isFinite(window.usedPercent)) continue;
      const provider = shortProviderName(limitName);
      const windowName = formatWindowName(window.windowDurationMins);
      windows.push({
        id: `${limitId}-${kind}`,
        label: provider === "Codex" ? windowName : `${provider} · ${windowName}`,
        remainingPercent: clampPercent(100 - window.usedPercent),
        resetsAt: window.resetsAt ?? null,
      });
    }
  }

  if (windows.length === 0) throw new Error("No visible Codex usage windows returned");
  return { updatedAt: Date.now(), windows };
}

function resolveCodexCommand(codexPath: string): string {
  return expandHomePath(codexPath) || "codex";
}

export async function collectCodexUsage(codexPath: string, showSpark: boolean): Promise<ProviderUsage> {
  const command = resolveCodexCommand(codexPath);

  return await new Promise<ProviderUsage>((resolve, reject) => {
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

    const finish = (error?: Error, usage?: ProviderUsage) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      child.kill();
      if (error) reject(error);
      else if (usage) resolve(usage);
      else reject(new Error("Codex returned no usage data"));
    };

    const send = (message: unknown) => {
      if (settled || !child.stdin.writable) return;
      child.stdin.write(`${JSON.stringify(message)}\n`, (error) => {
        if (error && !settled) finish(error);
      });
    };
    const timer = setTimeout(() => finish(new Error("Codex usage request timed out")), 12_000);

    child.on("error", (error) => {
      const message =
        (error as NodeJS.ErrnoException).code === "ENOENT"
          ? `Codex CLI not found at "${command}". Update the Codex CLI Path in extension settings.`
          : error.message;
      finish(new Error(message));
    });
    child.stdin.on("error", (error) => {
      if (!settled) finish(error);
    });
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
            result?: RawCodexRateLimitResponse;
            error?: { message?: string };
          };
          if (message.id === 1) {
            send({ method: "initialized" });
            send({ id: 2, method: "account/rateLimits/read", params: null });
          } else if (message.id === 2 && message.result) {
            finish(undefined, parseCodexRateLimits(message.result, showSpark));
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
        clientInfo: { name: "system-monitor", version: "1.0.0" },
        capabilities: { experimentalApi: true },
      },
    });
  });
}

export function parseClaudeUsageHistory(text: string): ProviderUsage {
  const raw = JSON.parse(text) as RawClaudeUsageHistory;
  const sample = raw.samples
    ?.filter((candidate) => Number.isFinite(candidate.t) && candidate.u)
    .sort((a, b) => (b.t ?? 0) - (a.t ?? 0))[0];

  if (!sample?.u || !sample.t) throw new Error("No Claude usage samples found");

  const windows: UsageWindow[] = [];
  if (Number.isFinite(sample.u.fh)) {
    windows.push({
      id: "claude-five-hour",
      label: "5-hour",
      remainingPercent: clampPercent(100 - sample.u.fh!),
      resetsAt: null,
    });
  }
  if (Number.isFinite(sample.u.sd)) {
    windows.push({
      id: "claude-weekly",
      label: "Weekly",
      remainingPercent: clampPercent(100 - sample.u.sd!),
      resetsAt: null,
    });
  }
  if (windows.length === 0) throw new Error("Claude usage sample has no rate-limit windows");

  return { updatedAt: sample.t, windows };
}

export async function collectClaudeUsage(usagePath: string): Promise<ProviderUsage> {
  const filePath = expandHomePath(usagePath);
  if (!filePath) throw new Error("Claude Usage File is not configured");
  return parseClaudeUsageHistory(await readFile(filePath, "utf8"));
}

export function formatUsageReset(timestamp: number | null, now = Date.now()): string {
  if (!timestamp) return "Reset time unavailable";
  const remainingMs = timestamp * 1000 - now;
  if (remainingMs <= 0) return "Resetting soon";

  const totalMinutes = Math.ceil(remainingMs / 60_000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  return days > 0 ? `${days}d ${hours}h` : hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

export function formatSourceAge(timestamp: number, now = Date.now()): string {
  const elapsedMinutes = Math.max(0, Math.floor((now - timestamp) / 60_000));
  if (elapsedMinutes < 1) return "Updated just now";
  if (elapsedMinutes < 60) return `Updated ${elapsedMinutes}m ago`;
  const hours = Math.floor(elapsedMinutes / 60);
  if (hours < 24) return `Updated ${hours}h ago`;
  return `Updated ${Math.floor(hours / 24)}d ago`;
}
