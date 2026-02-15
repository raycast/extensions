import { readdirSync, readFileSync, writeFileSync, renameSync } from "fs";
import { homedir } from "os";
import { basename, join } from "path";

import {
  CctopSession,
  KNOWN_STATUSES,
  SessionStatus,
  STATUS_SORT_ORDER,
} from "./types";

/**
 * Returns the sessions directory, checking CCTOP_SESSIONS_DIR env var first.
 * Matches Config.swift logic.
 */
export function getSessionsDir(): string {
  const override = process.env.CCTOP_SESSIONS_DIR;
  if (override) return override;
  return join(homedir(), ".cctop", "sessions");
}

/**
 * Check if a process is alive using kill(pid, 0).
 * Matches Session.swift isAlive logic (without pidStartTime check).
 * EPERM means the process exists but is owned by another user.
 */
export function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e: unknown) {
    if (e instanceof Error && "code" in e) {
      return (e as NodeJS.ErrnoException).code === "EPERM";
    }
    return false;
  }
}

/**
 * Forward-compatible status parsing matching SessionStatus.init(from:).
 * Known statuses pass through; unknown statuses fall back to needs_attention or working.
 */
function parseStatus(raw: string): SessionStatus {
  if ((KNOWN_STATUSES as readonly string[]).includes(raw))
    return raw as SessionStatus;
  return raw.includes("waiting") ? "needs_attention" : "working";
}

/**
 * Parse a single session JSON string. Returns null if parsing fails.
 */
function parseSession(json: string): CctopSession | null {
  try {
    const raw = JSON.parse(json);
    if (
      !raw.session_id ||
      !raw.project_path ||
      !raw.project_name ||
      !raw.branch ||
      !raw.last_activity
    )
      return null;
    return {
      session_id: raw.session_id,
      project_path: raw.project_path,
      project_name: raw.project_name,
      branch: raw.branch,
      status: parseStatus(raw.status ?? "idle"),
      last_prompt: raw.last_prompt ?? null,
      last_activity: raw.last_activity,
      started_at: raw.started_at ?? raw.last_activity,
      terminal: raw.terminal ?? null,
      pid: raw.pid ?? null,
      pid_start_time: raw.pid_start_time ?? null,
      last_tool: raw.last_tool ?? null,
      last_tool_detail: raw.last_tool_detail ?? null,
      notification_message: raw.notification_message ?? null,
      session_name: raw.session_name ?? null,
      workspace_file: raw.workspace_file ?? null,
      source: raw.source ?? null,
    };
  } catch {
    return null;
  }
}

/**
 * Load all live sessions from the sessions directory.
 * - Skips .tmp files (atomic writes in progress)
 * - Skips non-.json files
 * - Per-file try/catch so one corrupt file doesn't break the list
 * - Filters out sessions with no PID or dead PIDs
 * - Sorts by status priority, then by last_activity descending
 */
export function loadSessions(): CctopSession[] {
  const dir = getSessionsDir();

  let files: string[];
  try {
    files = readdirSync(dir);
  } catch {
    return [];
  }

  const sessions: CctopSession[] = [];

  for (const file of files) {
    if (!file.endsWith(".json") || file.endsWith(".tmp")) continue;

    try {
      const content = readFileSync(join(dir, file), "utf-8");
      const session = parseSession(content);
      if (!session) continue;
      if (session.pid == null || !isAlive(session.pid)) continue;
      sessions.push(session);
    } catch {
      // Skip unreadable files
    }
  }

  sessions.sort((a, b) => {
    const orderDiff = STATUS_SORT_ORDER[a.status] - STATUS_SORT_ORDER[b.status];
    if (orderDiff !== 0) return orderDiff;
    // Within same status group, most recent activity first
    return b.last_activity.localeCompare(a.last_activity);
  });

  return sessions;
}

/**
 * Display name: session_name if set, otherwise project_name.
 * Matches Session.swift displayName.
 */
export function displayName(session: CctopSession): string {
  return session.session_name ?? session.project_name;
}

/**
 * Source label: "OC" for opencode, "CC" for Claude Code.
 * Matches Session.swift sourceLabel.
 */
export function sourceLabel(session: CctopSession): string {
  return session.source === "opencode" ? "OC" : "CC";
}

/**
 * Format tool display matching Session.swift formatToolDisplay.
 * Case-insensitive matching (opencode sends lowercase, Claude Code sends capitalized).
 */
export function formatToolDisplay(
  tool: string,
  detail?: string | null,
): string {
  if (!detail) return `${tool}...`;
  const name = basename(detail);
  switch (tool.toLowerCase()) {
    case "bash":
      return `Running: ${detail.substring(0, 30)}`;
    case "edit":
      return `Editing ${name}`;
    case "write":
      return `Writing ${name}`;
    case "read":
      return `Reading ${name}`;
    case "grep":
      return `Searching: ${detail.substring(0, 30)}`;
    case "glob":
      return `Finding: ${detail.substring(0, 30)}`;
    case "webfetch":
      return `Fetching: ${detail.substring(0, 30)}`;
    case "websearch":
      return `Searching: ${detail.substring(0, 30)}`;
    case "task":
      return `Task: ${detail.substring(0, 30)}`;
    default:
      return `${tool}: ${detail.substring(0, 30)}`;
  }
}

/** Truncated last_prompt in quotes, matching Session.swift promptSnippet. */
function promptSnippet(session: CctopSession): string | null {
  if (!session.last_prompt) return null;
  return `"${session.last_prompt.substring(0, 36)}"`;
}

/**
 * Context line matching Session.swift contextLine.
 * Returns null for idle sessions.
 */
export function contextLine(session: CctopSession): string | null {
  switch (session.status) {
    case "idle":
      return null;
    case "compacting":
      return "Compacting context...";
    case "waiting_permission":
      return session.notification_message ?? "Permission needed";
    case "waiting_input":
    case "needs_attention":
      return promptSnippet(session);
    case "working":
      if (session.last_tool) {
        return formatToolDisplay(session.last_tool, session.last_tool_detail);
      }
      return promptSnippet(session);
    default:
      return null;
  }
}

/** Relative time string matching Session.swift relativeTime. */
export function relativeTime(isoDate: string): string {
  const seconds = Math.floor((Date.now() - new Date(isoDate).getTime()) / 1000);
  if (isNaN(seconds)) return "unknown";
  if (seconds < 0) return "just now";
  if (seconds >= 86400) return `${Math.floor(seconds / 86400)}d ago`;
  if (seconds >= 3600) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds >= 60) return `${Math.floor(seconds / 60)}m ago`;
  return `${seconds}s ago`;
}

/** Whether a session status needs user attention. Matches SessionStatus.swift needsAttention. */
export function needsAttention(status: SessionStatus): boolean {
  return (
    status === "waiting_permission" ||
    status === "waiting_input" ||
    status === "needs_attention"
  );
}

/**
 * Reset a session to idle by modifying its JSON file.
 * Read-modify-write with atomic rename, matching SessionManager.resetSession() in Swift.
 */
export function resetSession(session: CctopSession): void {
  if (session.pid == null) return;
  const dir = getSessionsDir();
  const filePath = join(dir, `${session.pid}.json`);
  const tmpPath = filePath + ".tmp";

  const raw = JSON.parse(readFileSync(filePath, "utf-8"));
  raw.status = "idle";
  raw.last_tool = null;
  raw.last_tool_detail = null;
  raw.notification_message = null;
  raw.last_activity = new Date().toISOString();

  writeFileSync(tmpPath, JSON.stringify(raw, null, 2));
  renameSync(tmpPath, filePath);
}

/**
 * Group sessions into status categories for sectioned display.
 */
export type StatusGroup = "Needs Attention" | "Active" | "Idle";

export function statusGroup(status: SessionStatus): StatusGroup {
  if (needsAttention(status)) return "Needs Attention";
  if (status === "working" || status === "compacting") return "Active";
  return "Idle";
}

/**
 * Group sessions by status category, preserving sort order within groups.
 * Omits empty groups.
 */
export function groupSessions(
  sessions: CctopSession[],
): { group: StatusGroup; sessions: CctopSession[] }[] {
  const order: StatusGroup[] = ["Needs Attention", "Active", "Idle"];
  const grouped = new Map<StatusGroup, CctopSession[]>();

  for (const session of sessions) {
    const group = statusGroup(session.status);
    const list = grouped.get(group) ?? [];
    list.push(session);
    grouped.set(group, list);
  }

  return order
    .filter((g) => grouped.has(g))
    .map((g) => ({ group: g, sessions: grouped.get(g)! }));
}
