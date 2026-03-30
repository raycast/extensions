import { readFileSync, writeFileSync, renameSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join, basename, dirname } from "node:path";
import {
  HookSession,
  HookStateFile,
  HookStateRaw,
  SessionState,
} from "../types";

function atomicWriteSync(filePath: string, data: string): void {
  const tmpPath = join(dirname(filePath), `.tmp-${process.pid}-${Date.now()}`);
  writeFileSync(tmpPath, data);
  renameSync(tmpPath, filePath);
}

function mutateHookState(
  mutator: (sessions: Record<string, HookStateRaw>) => void,
): boolean {
  if (!existsSync(STATE_FILE)) return false;
  const raw = readFileSync(STATE_FILE, "utf-8");
  const data: HookStateFile = JSON.parse(raw);
  mutator(data.sessions);
  atomicWriteSync(STATE_FILE, JSON.stringify(data, null, 2));
  return true;
}

const WORKTREE_PATTERN = /\/\.claude\/worktrees\/([^/]+)$/;
const LABEL_PROMPT_PREFIX = "用不超过10个字概括这个请求的核心目的";

const STATE_DIR = join(homedir(), ".claude", "claude-code-monitor");
const STATE_FILE = join(STATE_DIR, "sessions.json");
const STALE_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes

export function getStateFilePath(): string {
  return STATE_FILE;
}

export function getStateDirPath(): string {
  return STATE_DIR;
}

export function readHookSessions(): HookSession[] {
  if (!existsSync(STATE_FILE)) return [];

  try {
    const raw = readFileSync(STATE_FILE, "utf-8");
    const data: HookStateFile = JSON.parse(raw);
    const now = Date.now();

    return (
      Object.entries(data.sessions)
        .filter(([, session]) => {
          // Skip internal sessions (label generation via claude -p)
          if (session._internal) return false;
          if (session.first_prompt?.startsWith(LABEL_PROMPT_PREFIX))
            return false;
          return true;
        })
        .map(([key, session]) => {
          const cwd = session.cwd || "";
          const worktreeMatch = cwd.match(WORKTREE_PATTERN);
          const isWorktree = !!worktreeMatch;
          // For worktrees, extract real project name from parent path
          const projectName = isWorktree
            ? basename(cwd.replace(/\/\.claude\/worktrees\/[^/]+$/, ""))
            : session.project_name ||
              session.session_id?.slice(0, 8) ||
              key.slice(0, 8);

          const normalized: HookSession = {
            session_id: session.session_id || key,
            cwd,
            project_name: projectName,
            transcript_path: session.transcript_path || "",
            state: session.state || "ended",
            started_at: session.started_at || session.last_updated_at || now,
            last_updated_at: session.last_updated_at || now,
            ended_at: session.ended_at ?? null,
            last_event: session.last_event || "unknown",
            source: session.source || "",
            term_program: session.term_program,
            label: session.label,
            first_prompt: session.first_prompt,
            is_worktree: isWorktree || undefined,
            worktree_name: worktreeMatch ? worktreeMatch[1] : undefined,
          };
          // Mark stale sessions as ended
          if (
            normalized.state !== "ended" &&
            now - normalized.last_updated_at > STALE_THRESHOLD_MS
          ) {
            return {
              ...normalized,
              state: "ended" as SessionState,
              last_event: "StaleDetected",
            };
          }
          return normalized;
        })
        // Filter out ghost sessions: never had any user interaction
        .filter(
          (s) =>
            !!s.first_prompt ||
            !["SessionStart", "StaleCleanup", "StaleDetected"].includes(
              s.last_event,
            ),
        )
        .sort((a, b) => b.last_updated_at - a.last_updated_at)
    );
  } catch {
    return [];
  }
}

export function getActiveHookSessions(): HookSession[] {
  return readHookSessions().filter((s) => s.state !== "ended");
}

export function deleteHookSession(sessionId: string): boolean {
  try {
    return mutateHookState((sessions) => {
      delete sessions[sessionId];
    });
  } catch {
    return false;
  }
}

export function updateSessionLabel(sessionId: string, label: string): boolean {
  try {
    return mutateHookState((sessions) => {
      if (sessionId in sessions) {
        sessions[sessionId].label = label;
      }
    });
  } catch {
    return false;
  }
}

export function hooksInstalled(): boolean {
  return existsSync(join(STATE_DIR, "hook.sh"));
}
