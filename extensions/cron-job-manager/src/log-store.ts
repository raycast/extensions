import { LocalStorage } from "@raycast/api";
import { createHash } from "crypto";

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

export interface RunLog {
  id: string; // unique run id (timestamp-based)
  jobKey: string; // stable key for the job
  startedAt: number; // unix ms
  finishedAt: number; // unix ms
  durationMs: number;
  exitCode: number;
  stdout: string;
  stderr: string;
  success: boolean;
  triggeredBy: "manual" | "cron";
}

export interface JobRunSummary {
  jobKey: string;
  lastRun: RunLog | null;
  totalRuns: number;
  failureCount: number;
}

// ──────────────────────────────────────────────────────────────────────────────
// Key helpers
// ──────────────────────────────────────────────────────────────────────────────

/** Stable identifier for a job, based on schedule + command */
export function jobKey(schedule: string, command: string): string {
  return createHash("sha1")
    .update(`${schedule}::${command}`)
    .digest("hex")
    .slice(0, 16);
}

const LOGS_PREFIX = "run_logs_";
const MAX_LOGS_PER_JOB = 50;

function logsKey(key: string) {
  return `${LOGS_PREFIX}${key}`;
}

// ──────────────────────────────────────────────────────────────────────────────
// Read
// ──────────────────────────────────────────────────────────────────────────────

export async function getRunLogs(key: string): Promise<RunLog[]> {
  try {
    const raw = await LocalStorage.getItem<string>(logsKey(key));
    if (!raw) return [];
    return JSON.parse(raw) as RunLog[];
  } catch {
    return [];
  }
}

export async function getLastRun(key: string): Promise<RunLog | null> {
  const logs = await getRunLogs(key);
  return logs.length > 0 ? logs[0] : null;
}

export async function getJobSummary(key: string): Promise<JobRunSummary> {
  const logs = await getRunLogs(key);
  return {
    jobKey: key,
    lastRun: logs[0] ?? null,
    totalRuns: logs.length,
    failureCount: logs.filter((l) => !l.success).length,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Write
// ──────────────────────────────────────────────────────────────────────────────

export async function saveRunLog(log: RunLog): Promise<void> {
  const existing = await getRunLogs(log.jobKey);
  // Prepend newest, cap at MAX_LOGS_PER_JOB
  const updated = [log, ...existing].slice(0, MAX_LOGS_PER_JOB);
  await LocalStorage.setItem(logsKey(log.jobKey), JSON.stringify(updated));
}

export async function clearRunLogs(key: string): Promise<void> {
  await LocalStorage.removeItem(logsKey(key));
}

// ──────────────────────────────────────────────────────────────────────────────
// Formatting helpers
// ──────────────────────────────────────────────────────────────────────────────

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const min = Math.floor(ms / 60000);
  const sec = Math.floor((ms % 60000) / 1000);
  return `${min}m ${sec}s`;
}

export function formatRelativeTime(ts: number): string {
  const diffMs = Date.now() - ts;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay === 1) return "yesterday";
  if (diffDay < 7) return `${diffDay} days ago`;
  return new Date(ts).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function formatAbsoluteTime(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
