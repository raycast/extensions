import { readFile, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type { Usage, UsageWindow } from "../types";

export const CLAUDE_DIR = join(homedir(), ".claude");
export const BRIDGE_DATA_FILE = join(CLAUDE_DIR, "usage-ring.json");

function parseWindow(w: unknown): UsageWindow | null {
  if (!w || typeof w !== "object") return null;
  const o = w as Record<string, unknown>;
  if (typeof o.used_percentage !== "number" || !Number.isFinite(o.used_percentage)) return null;
  const resetsAt =
    typeof o.resets_at === "number" && Number.isFinite(o.resets_at) && o.resets_at > 0
      ? new Date(o.resets_at * 1000).toISOString()
      : null;
  return { utilization: Math.max(0, Math.min(100, o.used_percentage)), resetsAt };
}

export function parseRateLimits(json: unknown, capturedAt: number): Usage | null {
  if (!json || typeof json !== "object") return null;
  const o = json as Record<string, unknown>;
  const fiveHour = parseWindow(o.five_hour);
  const sevenDay = parseWindow(o.seven_day);
  if (!fiveHour && !sevenDay) return null;
  return { fiveHour, sevenDay, fetchedAt: capturedAt };
}

export async function readClaudeCodeUsage(file = BRIDGE_DATA_FILE): Promise<Usage | null> {
  try {
    const [raw, info] = await Promise.all([readFile(file, "utf8"), stat(file)]);
    return parseRateLimits(JSON.parse(raw), info.mtimeMs);
  } catch {
    return null;
  }
}
