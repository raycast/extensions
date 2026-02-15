// TypeScript types mirroring menubar/CctopMenubar/Models/Session.swift
// and menubar/CctopMenubar/Models/SessionStatus.swift

export const KNOWN_STATUSES = [
  "idle",
  "working",
  "compacting",
  "waiting_permission",
  "waiting_input",
  "needs_attention",
] as const;

export type SessionStatus = (typeof KNOWN_STATUSES)[number];

export interface TerminalInfo {
  program: string;
  session_id?: string | null;
  tty?: string | null;
}

export interface CctopSession {
  session_id: string;
  project_path: string;
  project_name: string;
  branch: string;
  status: SessionStatus;
  last_prompt?: string | null;
  last_activity: string; // ISO 8601, with or without fractional seconds
  started_at: string; // ISO 8601
  terminal?: TerminalInfo | null;
  pid?: number | null;
  pid_start_time?: number | null;
  last_tool?: string | null;
  last_tool_detail?: string | null;
  notification_message?: string | null;
  session_name?: string | null;
  workspace_file?: string | null;
  source?: string | null; // "opencode" or null/undefined for Claude Code
}

/**
 * Sort order matching SessionStatus.sortOrder in SessionStatus.swift.
 * Lower number = higher priority (shows first in list).
 */
export const STATUS_SORT_ORDER: Record<SessionStatus, number> = {
  waiting_permission: 0,
  waiting_input: 1,
  needs_attention: 1,
  working: 2,
  compacting: 3,
  idle: 4,
};
