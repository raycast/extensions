import { getPreferenceValues } from "@raycast/api";
import { readFile, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import type { Usage, UsageWindow } from "../types";

export const DEFAULT_CLAUDE_DIR = join(homedir(), ".claude");

function configuredClaudeDir(): string | undefined {
  try {
    return getPreferenceValues<Preferences>().claudeConfigDir?.trim() || undefined;
  } catch {
    return undefined;
  }
}

// Claude Code reads its settings from $CLAUDE_CONFIG_DIR when set. Raycast doesn't see the
// terminal's environment, so a preference can point at that folder instead.
export function resolveClaudeDir(custom?: string, env = process.env.CLAUDE_CONFIG_DIR): string {
  const dir = custom?.trim() || env?.trim();
  if (!dir) return DEFAULT_CLAUDE_DIR;
  if (dir === "~" || dir.startsWith("~/")) return join(homedir(), dir.slice(1));
  return resolve(dir);
}

export const CLAUDE_DIR = resolveClaudeDir(configuredClaudeDir());
export const BRIDGE_DATA_FILE = join(CLAUDE_DIR, "usage-ring.json");

export function displayPath(path: string): string {
  const home = homedir();
  return path === home || path.startsWith(home + "/") ? "~" + path.slice(home.length) : path;
}

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

export class UsageReadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UsageReadError";
  }
}

const isMissing = (e: unknown) => (e as NodeJS.ErrnoException)?.code === "ENOENT";

export async function readClaudeCodeUsage(file = BRIDGE_DATA_FILE): Promise<Usage | null> {
  let raw: string;
  let capturedAt: number;
  try {
    const [text, info] = await Promise.all([readFile(file, "utf8"), stat(file)]);
    raw = text;
    capturedAt = info.mtimeMs;
  } catch (e) {
    if (isMissing(e)) return null;
    const reason = (e as NodeJS.ErrnoException)?.code ?? (e instanceof Error ? e.message : String(e));
    throw new UsageReadError(`Can't read ${file} (${reason}). Check its permissions.`);
  }
  try {
    return parseRateLimits(JSON.parse(raw), capturedAt);
  } catch {
    throw new UsageReadError(`${file} isn't valid JSON. Send a message in Claude Code to rewrite it.`);
  }
}
