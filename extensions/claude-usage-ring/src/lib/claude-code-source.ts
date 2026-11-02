import { readFile, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type { Usage, UsageWindow } from "../types";

export const CLAUDE_DIR = join(homedir(), ".claude");
export const BRIDGE_DATA_FILE = join(CLAUDE_DIR, "usage-ring.json");

export type LocalSource = () => Promise<Usage | null>;

function parseLocalWindow(w: unknown): UsageWindow | null {
  if (!w || typeof w !== "object") return null;
  const o = w as Record<string, unknown>;
  if (typeof o.used_percentage !== "number" || !Number.isFinite(o.used_percentage)) return null;
  const resetsAt =
    typeof o.resets_at === "number" && Number.isFinite(o.resets_at) && o.resets_at > 0
      ? new Date(o.resets_at * 1000).toISOString()
      : null;
  return { utilization: Math.max(0, Math.min(100, o.used_percentage)), resetsAt, lockedReason: null };
}

export function parseRateLimits(json: unknown, capturedAt: number): Usage | null {
  if (!json || typeof json !== "object") return null;
  const o = json as Record<string, unknown>;
  const fiveHour = parseLocalWindow(o.five_hour);
  const sevenDay = parseLocalWindow(o.seven_day);
  if (!fiveHour && !sevenDay) return null;
  return {
    fiveHour,
    sevenDay,
    sevenDayOpus: null,
    sevenDaySonnet: null,
    fetchedAt: capturedAt,
    origin: "claude-code",
  };
}

export async function readClaudeCodeUsage(file = BRIDGE_DATA_FILE): Promise<Usage | null> {
  try {
    const [raw, info] = await Promise.all([readFile(file, "utf8"), stat(file)]);
    return parseRateLimits(JSON.parse(raw), info.mtimeMs);
  } catch {
    return null;
  }
}
