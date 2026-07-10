import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { asNumber, asRecord } from "./json";
import { getEnhancedPath } from "./node-path";
import type { ToolUsage, UsagePeriod } from "./types";

const execFileAsync = promisify(execFile);
const CCUSAGE_SPEC = "ccusage@latest";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** `YYYYMMDD` — the format ccusage's `--since` flag expects. */
function ymdCompact(d: Date): string {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

/** `YYYY-MM-DD` — the format ccusage emits in each `daily[].date`. */
function ymdDashed(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Local-time Monday of the week containing `now`. */
function startOfWeek(now: Date): Date {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const mondayOffset = (d.getDay() + 6) % 7; // Sun=0 -> 6, Mon=1 -> 0
  d.setDate(d.getDate() - mondayOffset);
  return d;
}

/** Cost field differs by tool: Claude uses `totalCost`, Codex uses `costUSD`. */
function readCost(record: Record<string, unknown>): number {
  return asNumber(record.totalCost) ?? asNumber(record.costUSD) ?? 0;
}

function toPeriod(record: Record<string, unknown> | undefined): UsagePeriod | undefined {
  if (!record) return undefined;
  return { totalTokens: asNumber(record.totalTokens) ?? 0, cost: readCost(record) };
}

async function runCcusage(kind: string, sinceYmd: string, npxPath?: string): Promise<unknown> {
  const runner = npxPath?.trim() || "npx";
  const args = ["-y", CCUSAGE_SPEC, kind, "daily", "--json", "--offline", "-s", sinceYmd];
  const { stdout } = await execFileAsync(runner, args, {
    env: { ...process.env, PATH: getEnhancedPath() },
    timeout: 30000,
    maxBuffer: 16 * 1024 * 1024,
  });
  return JSON.parse(stdout);
}

/**
 * Today's and this-week's token/cost usage for a tool, via the ccusage CLI (run with
 * `npx`). Reads local logs only; never throws — failures come back as `ToolUsage.error`.
 */
export async function readUsage(
  kind: "claude" | "codex",
  npxPath?: string,
  now: Date = new Date(),
): Promise<ToolUsage> {
  const tool = kind === "claude" ? "Claude Code" : "Codex";
  const today = ymdDashed(now);
  const weekStart = ymdCompact(startOfWeek(now));

  let data: unknown;
  try {
    data = await runCcusage(kind, weekStart, npxPath);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { tool, error: message.includes("ENOENT") ? "ccusage not runnable (npx not found)" : "ccusage failed" };
  }

  const root = asRecord(data);
  const totals = asRecord(root?.totals);
  const daily = Array.isArray(root?.daily) ? root.daily : [];
  const todayRow = daily.map(asRecord).find((r) => r?.date === today);

  return { tool, today: toPeriod(todayRow), week: toPeriod(totals) };
}
