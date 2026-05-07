import { homedir } from "os";
import { join } from "path";
import { getPreferenceValues } from "@raycast/api";

export type Prefs = {
  codexHome?: string;
  runningWindowSeconds?: string;
  includeArchived?: boolean;
};

export type Thread = {
  id: string;
  title: string | null;
  cwd: string | null;
  created_at: number;
  updated_at: number;
  tokens_used: number | null;
  model: string | null;
  model_provider: string | null;
  git_branch: string | null;
  archived: number;
  rollout_path: string | null;
  first_user_message: string | null;
};

function expandHome(p: string): string {
  if (!p) return p;
  if (p.startsWith("~")) return join(homedir(), p.slice(1));
  return p;
}

export function codexHome(): string {
  const prefs = getPreferenceValues<Prefs>();
  return expandHome(prefs.codexHome?.trim() || "~/.codex");
}

export function statePath(): string {
  return join(codexHome(), "state_5.sqlite");
}

export function logsPath(): string {
  return join(codexHome(), "logs_2.sqlite");
}

// Keep the per-row payload small — `first_user_message` can be many KB per
// thread and easily blows Raycast's SQL worker heap when there are hundreds
// of threads. We truncate it to a preview and trim the rest.
export const FIRST_MSG_PREVIEW_CHARS = 160;
export const DEFAULT_THREAD_LIMIT = 500;

export function threadsQuery(
  includeArchived: boolean,
  limit: number = DEFAULT_THREAD_LIMIT,
): string {
  const where = includeArchived ? "" : "WHERE COALESCE(archived, 0) = 0";
  const safeLimit = Math.max(1, Math.min(5000, Math.floor(limit)));
  return `SELECT id, title, cwd, created_at, updated_at, tokens_used,
                 model, model_provider, git_branch, archived,
                 rollout_path,
                 substr(COALESCE(first_user_message, ''), 1, ${FIRST_MSG_PREVIEW_CHARS}) AS first_user_message
          FROM threads
          ${where}
          ORDER BY updated_at DESC
          LIMIT ${safeLimit}`;
}

export function runningThreadsQuery(windowSeconds: number): string {
  const cutoffSec = Math.floor(Date.now() / 1000) - windowSeconds;
  return `SELECT thread_id, MAX(ts) AS last_ts
          FROM logs
          WHERE thread_id IS NOT NULL
            AND thread_id <> ''
            AND ts >= ${cutoffSec}
          GROUP BY thread_id`;
}

export type RunningRow = { thread_id: string; last_ts: number };

// Threads with log activity in the last `IN_PROGRESS_SECONDS` are considered
// actively generating.
export const IN_PROGRESS_SECONDS = 10;

export type ThreadStatus = "in_progress" | "idle";

// Codex's unread indicator (`has_unread_turn`) is held purely in-memory by the
// running app — it is never written to `state_5.sqlite` or the rollout
// JSONLs. That means there is no reliable way for an external process to
// reproduce Codex's exact unread state. So we don't try: we only surface
// what we *can* observe — namely, whether the thread is actively generating
// right now, based on fresh log activity.
export function statusFor(
  thread: Thread,
  runningMap: Map<string, number>,
): ThreadStatus {
  const lastTs = runningMap.get(thread.id);
  if (!lastTs) return "idle";
  const ageSec = Math.floor(Date.now() / 1000) - lastTs;
  if (ageSec <= IN_PROGRESS_SECONDS) return "in_progress";
  return "idle";
}

export function buildRunningMap(
  rows: RunningRow[] | undefined,
): Map<string, number> {
  const map = new Map<string, number>();
  if (!rows) return map;
  for (const r of rows) {
    map.set(r.thread_id, r.last_ts);
  }
  return map;
}

export function codexThreadUrl(threadId: string): string {
  return `codex://threads/${threadId}`;
}

export function fmtRelative(epochSec: number): string {
  if (!epochSec) return "";
  const diff = Math.max(0, Date.now() / 1000 - epochSec);
  if (diff < 60) return `${Math.round(diff)}s ago`;
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
  return `${Math.round(diff / 86400)}d ago`;
}

export function fmtTokens(n: number | null): string {
  if (!n) return "0";
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(1)}K`;
  if (n < 1_000_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  return `${(n / 1_000_000_000).toFixed(2)}B`;
}

export function shortCwd(cwd: string | null): string {
  if (!cwd) return "";
  return cwd.replace(homedir(), "~");
}

export function getRunningWindowSeconds(): number {
  const prefs = getPreferenceValues<Prefs>();
  const v = parseInt(prefs.runningWindowSeconds || "60", 10);
  return Number.isFinite(v) && v > 0 ? v : 60;
}

export function shouldIncludeArchived(): boolean {
  const prefs = getPreferenceValues<Prefs>();
  return Boolean(prefs.includeArchived);
}
