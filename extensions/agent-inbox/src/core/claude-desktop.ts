import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { CLAUDE_DESKTOP_SESSIONS } from "./paths";
import { Session } from "./types";

export const CLAUDE_BUNDLE = "com.anthropic.claudefordesktop";
export const CLAUDE_LOCAL_ID = /^local_[A-Za-z0-9-]{1,64}$/;
export const CLAUDE_BRIDGE_ID = /^(?:cse|session)_([A-Za-z0-9-]{1,128})$/;

/** A window identity is enough to save/jump, but does not provide remote execution state. */
export function isClaudeCloudOnly(session: Session): boolean {
  return (
    session.agent === "claude" &&
    session.host === "app" &&
    CLAUDE_BRIDGE_ID.test(session.sessionId) &&
    !session.locator.claudeDesktopId &&
    !session.transcriptPath &&
    !session.state
  );
}

export interface ClaudeDesktopSession {
  sessionId: string;
  cliSessionId: string;
  cwd: string;
  title: string;
  createdAt: number;
  lastActivityAt: number;
  lastFocusedAt: number;
  isArchived: boolean;
  /** Remote Control aliases; older app versions stored a single string. */
  bridgeSessionIds?: string[];
}

const text = (v: unknown) => (typeof v === "string" ? v : "");
const time = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
const cached = new Map<string, { mtime: number; size: number; record: ClaudeDesktopSession | null }>();

/** Read only the desktop session metadata; never import transcripts, secrets or launch state. */
export function readClaudeDesktopSessions(root = CLAUDE_DESKTOP_SESSIONS): ClaudeDesktopSession[] {
  const records: ClaudeDesktopSession[] = [];
  const visit = (dir: string, depth: number) => {
    try {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const path = join(dir, entry.name);
        if (entry.isDirectory() && depth < 2) visit(path, depth + 1);
        else if (entry.isFile() && entry.name.startsWith("local_") && entry.name.endsWith(".json")) {
          try {
            const st = statSync(path);
            if (st.size > 10 * 1024 * 1024) continue;
            const hit = cached.get(path);
            let record = hit?.mtime === st.mtimeMs && hit.size === st.size ? hit.record : undefined;
            if (record === undefined) {
              const raw = JSON.parse(readFileSync(path, "utf8"));
              record =
                raw && CLAUDE_LOCAL_ID.test(text(raw.sessionId))
                  ? {
                      sessionId: raw.sessionId,
                      cliSessionId: text(raw.cliSessionId),
                      cwd: text(raw.cwd),
                      title: text(raw.title),
                      createdAt: time(raw.createdAt),
                      lastActivityAt: time(raw.lastActivityAt),
                      lastFocusedAt: time(raw.lastFocusedAt),
                      isArchived: raw.isArchived === true,
                      ...bridgeAliases(raw.bridgeSessionIds),
                    }
                  : null;
              cached.set(path, { mtime: st.mtimeMs, size: st.size, record });
            }
            if (record) records.push(record);
          } catch {
            // Missing, partially written or unsupported records are ignored.
          }
        }
      }
    } catch {
      // Desktop is optional; not all accounts are available on every machine.
    }
  };
  visit(root, 0);
  return records;
}

function bridgeAliases(value: unknown): { bridgeSessionIds?: string[] } {
  const ids = (Array.isArray(value) ? value : [value]).filter((id): id is string => typeof id === "string" && CLAUDE_BRIDGE_ID.test(id));
  return ids.length ? { bridgeSessionIds: [...new Set(ids)] } : {};
}

/** Claude uses cse_* and session_* as aliases for the same cloud/bridge suffix. */
export function sameClaudeBridgeId(a: string, b: string): boolean {
  const suffix = a.match(CLAUDE_BRIDGE_ID)?.[1];
  return !!suffix && suffix === b.match(CLAUDE_BRIDGE_ID)?.[1];
}

/** Do not guess when multiple desktop records claim the same CLI transcript. */
export function findClaudeDesktopSession(id: string, records: ClaudeDesktopSession[]): ClaudeDesktopSession | undefined {
  const matches = records.filter(
    (r) => r.cliSessionId === id || r.sessionId === id || r.bridgeSessionIds?.some((b) => sameClaudeBridgeId(b, id)),
  );
  return matches.length === 1 ? matches[0] : undefined;
}

export function hasClaudeTerminalLocator(s: Session): boolean {
  return (
    s.host === "cli" &&
    ((!!s.locator.claudeEntrypoint && !/desktop/i.test(s.locator.claudeEntrypoint)) ||
      ((s.status === "running" || s.status === "needs_input") &&
        !!(s.locator.tty || s.locator.tmuxPane) &&
        s.locator.bundleId !== CLAUDE_BUNDLE))
  );
}

/** Repair historical CLI guesses, while preserving a session explicitly resumed in a terminal. */
export function enrichClaudeSessions(sessions: Session[], records?: ClaudeDesktopSession[]): Session[] {
  if (!sessions.some((s) => s.agent === "claude")) return sessions;
  const desktop = records ?? readClaudeDesktopSessions();
  return sessions.map((s) => {
    if (s.agent !== "claude" || hasClaudeTerminalLocator(s)) return s;
    const record = findClaudeDesktopSession(s.sessionId, desktop);
    if (!record) return s;
    return {
      ...s,
      host: "app",
      title: record.title || s.title,
      cwd: record.cwd || s.cwd,
      locator: { ...s.locator, claudeDesktopId: record.sessionId },
    };
  });
}
