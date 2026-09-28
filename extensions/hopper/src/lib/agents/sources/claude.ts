// Claude Code, wherever it runs: a terminal, the Claude app's Code tab (which runs the same CLI), an IDE, `--bg`.
// Every running session writes ~/.claude/sessions/<pid>.json with its session id, folder and status
// (busy / shell / idle / waiting + what it waits for), the list `claude agents` itself reads (ADR-022).
// Sessions started by the Claude app also have the app's session file (ADR-014): its title, when it was last
// focused, and a post-turn summary that says whether the last turn ended asking for input.

import {
  codeSessionKey,
  codeSessionUrl,
  SESSIONS_DIR as DESKTOP_DIR,
  SESSION_FILE as DESKTOP_FILE,
} from "../../tabs/sources/claude";
import type { Agent, AgentContext, AgentSource, AgentStatus, Host } from "../model";

const REGISTRY_DIR = ".claude/sessions";
const REGISTRY_FILE = /^\d+\.json$/;
const CLAUDE_APP = "com.anthropic.claudefordesktop";

/** A running session, from its ~/.claude/sessions/<pid>.json. */
export interface LiveSession {
  pid: number;
  sessionId: string;
  cwd: string;
  /** "Sat Sep 26 18:42:14 2026", UTC: with the pid, tells a live process from a reused pid. */
  procStart?: string;
  kind: string;
  entrypoint: string;
  /** The Claude app's session (`local_<uuid>`), for sessions it started. */
  hostSessionId?: string;
  name?: string;
  status: string;
  statusUpdatedAt?: number;
  waitingFor?: string;
}

/** The Claude app's record of a Code session. */
export interface DesktopSession {
  sessionId: string;
  cliSessionId?: string;
  title?: string;
  lastActivityAt?: number;
  lastFocusedAt?: number;
  /** postTurnSummary.status_category: completed, blocked, need_input, review_ready, failed. */
  turnOutcome?: string;
}

const str = (v: unknown) => (typeof v === "string" && v ? v : undefined);
const num = (v: unknown) => (typeof v === "number" ? v : undefined);

export function parseLiveSession(text: string): LiveSession | undefined {
  let d: Record<string, unknown>;
  try {
    d = JSON.parse(text);
  } catch {
    return undefined;
  }
  const pid = num(d?.pid);
  const sessionId = str(d?.sessionId);
  if (!pid || !sessionId) return undefined;
  return {
    pid,
    sessionId,
    cwd: str(d.cwd) ?? "",
    procStart: str(d.procStart),
    kind: str(d.kind) ?? "interactive",
    entrypoint: str(d.entrypoint) ?? "cli",
    hostSessionId: str(d.hostSessionId),
    name: str(d.name),
    status: str(d.status) ?? "",
    statusUpdatedAt: num(d.statusUpdatedAt),
    waitingFor: str(d.waitingFor),
  };
}

export function parseDesktopSession(text: string): DesktopSession | undefined {
  let d: Record<string, unknown>;
  try {
    d = JSON.parse(text);
  } catch {
    return undefined;
  }
  const sessionId = str(d?.sessionId);
  if (!sessionId) return undefined;
  const summary = d.postTurnSummary as Record<string, unknown> | undefined;
  return {
    sessionId,
    cliSessionId: str(d.cliSessionId),
    title: str(d.title),
    lastActivityAt: num(d.lastActivityAt),
    lastFocusedAt: num(d.lastFocusedAt),
    turnOutcome: str(summary?.status_category),
  };
}

/** Whether `session`'s process is still the one that wrote it (pids are reused). */
export function isLive(session: LiveSession, processes: Map<number, { startedAt: number }>): boolean {
  const proc = processes.get(session.pid);
  if (!proc) return false;
  if (!session.procStart) return true;
  const started = Date.parse(`${session.procStart} UTC`);
  return Number.isNaN(started) || Math.abs(proc.startedAt - started) < 2000;
}

/** "approve Bash: npm test" → "Approve Bash"; other reasons capitalized. Commands aren't shown. */
export function waitingLabel(waitingFor: string | undefined): string {
  if (!waitingFor) return "Needs input";
  const approve = /^approve\s+([^:]+)/i.exec(waitingFor);
  const text = approve ? `approve ${approve[1].trim()}` : waitingFor;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Status from the session file; the app's post-turn summary says how a finished turn ended. */
export function statusOf(live: LiveSession, desktop?: DesktopSession): { status: AgentStatus; detail?: string } {
  switch (live.status) {
    case "waiting":
      return { status: "blocked", detail: waitingLabel(live.waitingFor) };
    case "busy":
    case "shell":
      return { status: "working" };
    case "idle":
      // A turn that ended with a question isn't a prompt waiting on the user (that's "waiting" above): it's a
      // finished turn, done until seen (status.ts), with the reason shown.
      if (desktop?.turnOutcome === "blocked" || desktop?.turnOutcome === "need_input") {
        return { status: "idle", detail: "Needs input" };
      }
      if (desktop?.turnOutcome === "failed") return { status: "idle", detail: "Failed" };
      return { status: "idle" };
    default:
      return { status: "unknown" };
  }
}

/** Surfaces that have nothing to jump to or aren't agents the user runs (SDK scripts, daemons). */
const HIDDEN_KINDS = new Set(["daemon", "daemon-worker"]);
const HIDDEN_ENTRYPOINTS = /^(sdk-|github-action$|remote$)/;

/**
 * One agent per session. The Claude app can run side processes (forks) for a session; the one whose session id
 * is the app's `cliSessionId` wins.
 */
export function toAgents(live: LiveSession[], desktop: DesktopSession[]): Agent[] {
  const byHost = new Map(desktop.map((d) => [d.sessionId, d]));
  const chosen = new Map<string, LiveSession>();
  for (const session of live) {
    if (HIDDEN_KINDS.has(session.kind) || HIDDEN_ENTRYPOINTS.test(session.entrypoint)) continue;
    const group = session.hostSessionId ?? session.sessionId;
    const current = chosen.get(group);
    const preferred = byHost.get(group)?.cliSessionId;
    if (!current || session.sessionId === preferred) chosen.set(group, session);
  }
  return [...chosen.values()].map((session) => {
    const app = session.hostSessionId ? byHost.get(session.hostSessionId) : undefined;
    const { status, detail } = statusOf(session, app);
    const host: Host = session.hostSessionId
      ? {
          kind: "place",
          tabKey: codeSessionKey(CLAUDE_APP, session.hostSessionId),
          bundleId: CLAUDE_APP,
          url: codeSessionUrl(session.hostSessionId),
        }
      : { kind: "process", pid: session.pid, tty: "" };
    return {
      key: `claude:${session.sessionId}`,
      source: claude.id,
      product: "Claude Code",
      id: session.sessionId,
      title: app?.title ?? session.name ?? (session.cwd.split("/").pop() || "Claude Code"),
      cwd: session.cwd || undefined,
      status,
      statusDetail: detail,
      since: session.statusUpdatedAt,
      activeAt: status === "idle" ? (app?.lastActivityAt ?? session.statusUpdatedAt) : undefined,
      seenAt: app?.lastFocusedAt,
      host,
      resumeCommand: `cd ${shellQuote(session.cwd || "~")} && claude --resume ${session.sessionId}`,
      sessionIds: [session.sessionId],
    };
  });
}

function shellQuote(path: string): string {
  return /^[\w@%+=:,./~-]+$/.test(path) ? path : `'${path.replace(/'/g, "'\\''")}'`;
}

export const claude: AgentSource = {
  id: "claude",
  list: async ({ platform, processes }: AgentContext) => {
    const home = platform.homeDir();
    const [registry, desktopFiles] = await Promise.all([
      platform.readFiles(`${home}/${REGISTRY_DIR}`, REGISTRY_FILE, 0),
      platform.readFiles(`${home}/${DESKTOP_DIR}`, DESKTOP_FILE, 3),
    ]);
    const procs = new Map(processes.map((p) => [p.pid, p]));
    const live = registry.flatMap((f) => parseLiveSession(f.text) ?? []).filter((s) => isLive(s, procs));
    const agents = toAgents(
      live,
      desktopFiles.flatMap((f) => parseDesktopSession(f.text) ?? []),
    );
    // Terminal sessions are found by their tty.
    return agents.map((agent) =>
      agent.host.kind === "process"
        ? { ...agent, host: { ...agent.host, tty: procs.get(agent.host.pid)?.tty ?? "" } }
        : agent,
    );
  },
};
