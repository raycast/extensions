import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { getPreferenceValues } from "@raycast/api";

/**
 * Reader for the small cache file the user's Claude Code statusline writes:
 *   ~/.claude/.claude-gauge-usage.json
 *   { "rate_limits": { five_hour: {...}, seven_day: {...} }, "captured_at": <epoch s> }
 *
 * The exact subfield names inside `five_hour` / `seven_day` are not guaranteed,
 * so we parse DEFENSIVELY — accepting any of several common spellings for the
 * utilization percent and the reset timestamp — and always keep the `raw`
 * object around for the debug action.
 */

export const CACHE_FILENAME = ".claude-gauge-usage.json";

export type LimitWindow = {
  /** Utilization as a 0–100 percentage, or `null` when unknown. */
  percentUsed: number | null;
  /** Reset timestamp, or `null` when unknown. */
  resetsAt: Date | null;
  /** The raw window object exactly as cached, for debugging. */
  raw: unknown;
};

export type StatuslineCache =
  | {
      configured: true;
      fiveHour: LimitWindow;
      sevenDay: LimitWindow;
      /** When the statusline captured this snapshot. */
      capturedAt: Date | null;
      /** Age of the snapshot in milliseconds (now - capturedAt). */
      ageMs: number | null;
      /** The full raw `rate_limits` object, for the debug action. */
      rawRateLimits: unknown;
      /** Absolute path the cache was read from. */
      path: string;
    }
  | {
      configured: false;
      /** Why the cache is unavailable. */
      reason: "missing" | "unreadable" | "invalid";
      message: string;
      /** Absolute path we expected the cache at. */
      path: string;
    };

/**
 * Keys whose name explicitly says "percent(age)" — these are authoritative
 * 0–100 values (Claude Code emits `used_percentage` as an integer percent) and
 * are used verbatim, never rescaled.
 */
const PERCENT_KEYS = [
  "used_percentage",
  "usedPercentage",
  "percent",
  "percentUsed",
  "percent_used",
  "usagePercent",
  "usage_percent",
];

/**
 * Ambiguous keys that MIGHT hold a 0–1 fraction rather than a 0–100 percent.
 * We only scale these when the value is strictly below 1, so a literal `1`
 * (i.e. 1% used) is never mistaken for the fraction 1.0 (100% used).
 */
const FRACTION_CAPABLE_KEYS = ["utilization", "used", "usage"];

const RESET_KEYS = [
  "resets_at",
  "resetsAt",
  "reset_at",
  "resetAt",
  "reset",
  "resetsAtUnix",
  "resets_at_unix",
];

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : undefined;
}

/** Parse a finite number from a value that may be a number or numeric string. */
function readNumber(raw: unknown): number | null {
  const value =
    typeof raw === "number"
      ? raw
      : typeof raw === "string"
        ? Number.parseFloat(raw)
        : NaN;
  return Number.isFinite(value) ? value : null;
}

/** Pull a 0–100 percentage from a window object, tolerating 0–1 fractions. */
function readPercent(
  window: Record<string, unknown> | undefined,
): number | null {
  if (!window) return null;

  // Explicit percentage fields are authoritative 0–100 values — use as-is.
  for (const key of PERCENT_KEYS) {
    const value = readNumber(window[key]);
    if (value != null) return value;
  }

  // Ambiguous fields may be a 0–1 fraction; scale only when strictly below 1
  // so a literal `1` (1% used) is never misread as the fraction 1.0 (100%).
  for (const key of FRACTION_CAPABLE_KEYS) {
    const value = readNumber(window[key]);
    if (value != null) return value > 0 && value < 1 ? value * 100 : value;
  }

  return null;
}

/** Pull a reset timestamp from a window object (ISO string or epoch sec/ms). */
function readReset(window: Record<string, unknown> | undefined): Date | null {
  if (!window) return null;
  for (const key of RESET_KEYS) {
    const raw = window[key];
    if (raw == null) continue;
    if (typeof raw === "number") {
      // Heuristic: seconds vs. milliseconds since epoch.
      const ms = raw < 1e12 ? raw * 1000 : raw;
      const d = new Date(ms);
      if (!Number.isNaN(d.getTime())) return d;
    }
    if (typeof raw === "string") {
      const d = new Date(raw);
      if (!Number.isNaN(d.getTime())) return d;
      const epoch = Number.parseFloat(raw);
      if (Number.isFinite(epoch)) {
        const ms = epoch < 1e12 ? epoch * 1000 : epoch;
        const d2 = new Date(ms);
        if (!Number.isNaN(d2.getTime())) return d2;
      }
    }
  }
  return null;
}

function parseWindow(value: unknown): LimitWindow {
  const window = asRecord(value);
  return {
    percentUsed: readPercent(window),
    resetsAt: readReset(window),
    raw: value ?? null,
  };
}

/** Resolve the Claude config directory from preferences, env, or the default. */
export function resolveClaudeConfigDir(): string {
  let pref: string | undefined;
  try {
    pref = getPreferenceValues<Preferences>().claudeConfigDir;
  } catch {
    pref = undefined;
  }
  const fromEnv = process.env.CLAUDE_CONFIG_DIR;
  const dir = (pref && pref.trim()) || (fromEnv && fromEnv.trim());
  return dir || join(homedir(), ".claude");
}

/** Absolute path to the statusline cache file. */
export function cacheFilePath(): string {
  return join(resolveClaudeConfigDir(), CACHE_FILENAME);
}

/**
 * Read and defensively parse the statusline cache. Never throws — a missing or
 * malformed file returns a `{ configured: false }` sentinel with guidance.
 */
export async function readStatuslineCache(): Promise<StatuslineCache> {
  const path = cacheFilePath();

  let contents: string;
  try {
    contents = await readFile(path, "utf8");
  } catch (err) {
    const e = err as NodeJS.ErrnoException;
    if (e.code === "ENOENT") {
      return {
        configured: false,
        reason: "missing",
        message: "The status line capture file does not exist yet.",
        path,
      };
    }
    return {
      configured: false,
      reason: "unreadable",
      message: e.message || "Could not read the cache file.",
      path,
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(contents);
  } catch {
    return {
      configured: false,
      reason: "invalid",
      message: "The cache file is not valid JSON.",
      path,
    };
  }

  const root = asRecord(parsed);
  const rateLimits = asRecord(root?.rate_limits ?? root?.rateLimits);
  if (!rateLimits) {
    return {
      configured: false,
      reason: "invalid",
      message:
        "The cache file does not contain a `rate_limits` object yet. Run Claude Code once to populate it.",
      path,
    };
  }

  const fiveHourRaw =
    rateLimits.five_hour ?? rateLimits.fiveHour ?? rateLimits["5h"];
  const sevenDayRaw =
    rateLimits.seven_day ?? rateLimits.sevenDay ?? rateLimits["7d"];

  const capturedRaw = root?.captured_at ?? root?.capturedAt;
  let capturedAt: Date | null = null;
  if (typeof capturedRaw === "number" && Number.isFinite(capturedRaw)) {
    capturedAt = new Date(
      capturedRaw < 1e12 ? capturedRaw * 1000 : capturedRaw,
    );
  } else if (typeof capturedRaw === "string") {
    const d = new Date(capturedRaw);
    capturedAt = Number.isNaN(d.getTime()) ? null : d;
  }

  return {
    configured: true,
    fiveHour: parseWindow(fiveHourRaw),
    sevenDay: parseWindow(sevenDayRaw),
    capturedAt,
    ageMs: capturedAt ? Date.now() - capturedAt.getTime() : null,
    rawRateLimits: rateLimits,
    path,
  };
}
