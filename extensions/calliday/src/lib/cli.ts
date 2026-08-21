import { getPreferenceValues } from "@raycast/api";
import { execFile } from "child_process";
import { homedir } from "os";
import { promisify } from "util";

const exec = promisify(execFile);

/** Resolve the calliday binary from preferences (default: where the app
 * installs it). `~` is expanded so the preference stays readable. */
export function cliPath(): string {
  const { cliPath } = getPreferenceValues<Preferences>();
  const raw = cliPath.trim() || "~/Library/Application Support/Calliday/bin/calliday";
  return raw.startsWith("~") ? homedir() + raw.slice(1) : raw;
}

export async function calliday(args: string[]): Promise<string> {
  try {
    const { stdout } = await exec(cliPath(), args);
    return stdout;
  } catch (error) {
    const err = error as NodeJS.ErrnoException & { stderr?: string };
    if (err.code === "ENOENT") {
      throw new Error(
        "calliday CLI not found — open Calliday and check Settings → General, or set the path in this extension's preferences.",
      );
    }
    const stderr = err.stderr?.trim();
    if (stderr) {
      throw new Error(stderr);
    }
    throw error;
  }
}

export async function callidayJSON<T>(args: string[]): Promise<T> {
  const raw = await calliday([...args, "--json"]);
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new Error("Calliday returned invalid data. Make sure the app is up to date.");
  }
}

// ── Shapes mirrored from the CLI's --json output ─────────────────────────

export interface Status {
  state: "tracking" | "idle" | "paused" | "stopped";
  current?: { app: string; title?: string; domain?: string; since: number };
  timer?: { name: string; project?: string; start: number };
  today_seconds: number;
}

export interface Tomatoes {
  interval_minutes: number;
  tomatoes: number;
  best_partial_seconds: number;
  active_remaining_minutes?: number | null;
  runs: {
    start: number;
    end: number;
    focus_seconds: number;
    ripenings: number[];
  }[];
}

export interface Report {
  rangeLabel: string;
  totalSeconds: number;
  productivity?: number | null;
  byProject: { name: string; seconds: number; productivity?: number | null }[];
  byApp: { name: string; seconds: number }[];
  byDomain: { name: string; seconds: number }[];
}

export interface SearchResults {
  query: string;
  from: number;
  to: number;
  results: SearchItem[];
}

export interface SearchItem {
  kind: "document" | "webpage";
  app: string;
  title: string;
  /** Absent when the document has no file behind it (a terminal tab, an
   *  unsaved buffer) — there is nothing to open, so don't offer to. */
  path?: string;
  url?: string;
  seconds: number;
}

// ── Formatting helpers ───────────────────────────────────────────────────

export function fmt(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${seconds}s`;
}

export function clock(ts: number): string {
  return new Date(ts * 1000).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}
