// Codex: the Codex app (ChatGPT.app, `com.openai.codex`) and the Codex CLI keep every thread in
// ~/.codex/state_<N>.sqlite (id, folder, name, source, last update) and log each thread's events to its rollout file.
// A rollout records when a turn starts and ends, so a thread is working while its last turn has started and not
// ended. Approval and input requests are never logged (Codex's rollout policy), so Codex agents are never
// "blocked" here; the app's live state is only on its private app-server pipe and internal IPC bus, which aren't
// for other apps (ADR-022).
//
// Threads from the app open with its codex://threads/<id> link, while the app runs. The app and the IDE extension
// both record source "vscode"; the originator ("Codex Desktop" for the app) tells them apart, and IDE threads aren't
// listed, since nothing says which editor window runs them. A CLI thread is listed while
// a `codex` process in a terminal works in its folder (that process is its host): only the folder's latest thread
// updated since that process started, since earlier threads there were other, finished runs. Verified with Codex
// 26.924 (app) and CLI 0.157.

import type { Platform, Process } from "../../platform/model";
import type { Agent, AgentContext, AgentSource, AgentStatus, Host } from "../model";

const DIR = ".codex";
const CODEX_APP = "com.openai.codex";
/** `originator` of the app's threads (verified with Codex 26.924); the IDE extension's threads have their own. */
const APP_ORIGINATOR = "Codex Desktop";
/** App threads older than this aren't listed: the list is for what's going on now. */
const RECENT_MS = 24 * 60 * 60 * 1000;
/** Enough of a rollout's end to hold its last turn events (big lines, e.g. tool output, can come after them). */
const TAIL_BYTES = 256 * 1024;

const threadsQuery = (since: number) => `select id, source, originator, cwd,
  coalesce(nullif(name, ''), nullif(title, '')) as title,
  updated_at_ms as updatedAt, rollout_path as rollout
from threads
where archived = 0 and source in ('cli', 'vscode', 'appServer') and updated_at_ms > ${Math.floor(since)}
order by updated_at_ms desc limit 50`;

/** The same from the columns the table was created with, for when Codex renames or drops a later one (no
 * originator: every non-CLI thread counts as the app's, as before Codex recorded it). */
const baseThreadsQuery = (since: number) => `select id, source, cwd, nullif(title, '') as title,
  updated_at * 1000 as updatedAt, rollout_path as rollout
from threads
where archived = 0 and source in ('cli', 'vscode', 'appServer') and updated_at > ${Math.floor(since / 1000)}
order by updated_at desc limit 50`;

/**
 * Codex's thread database file, from the names in ~/.codex. Its number is the schema version, which Codex bumps on
 * a breaking change (starting a new file), so the highest one is current; an older one can be left behind.
 */
export function threadsDb(names: string[]): string | undefined {
  let best: { name: string; version: number } | undefined;
  for (const name of names) {
    const version = Number(/^state_(\d+)\.sqlite$/.exec(name)?.[1]);
    if (version >= (best?.version ?? 0)) best = { name, version };
  }
  return best?.name;
}

export interface Thread {
  id: string;
  /** "cli" for the terminal UI; "vscode" / "appServer" for the app and IDE extension. */
  source: string;
  /** The client that started it: "Codex Desktop" for the app. Unset in databases from before Codex recorded it. */
  originator?: string;
  cwd?: string;
  title?: string;
  updatedAt?: number;
  rollout?: string;
}

export function parseThreads(rows: Record<string, unknown>[]): Thread[] {
  const str = (v: unknown) => (typeof v === "string" && v ? v : undefined);
  return rows.flatMap((r): Thread[] =>
    typeof r.id === "string"
      ? [
          {
            id: r.id,
            source: str(r.source) ?? "",
            originator: str(r.originator),
            cwd: str(r.cwd),
            title: str(r.title),
            updatedAt: typeof r.updatedAt === "number" ? r.updatedAt : undefined,
            rollout: str(r.rollout),
          },
        ]
      : [],
  );
}

const STARTED = new Set(["task_started", "turn_started"]);
const ENDED = new Set(["task_complete", "turn_complete", "turn_aborted"]);

/** Working if the rollout's last turn event is a start; idle if it's an end (or there's none). */
export function statusOf(rolloutTail: string): AgentStatus {
  const lines = rolloutTail.split("\n");
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    if (!line.includes('"event_msg"')) continue;
    let type: unknown;
    try {
      type = JSON.parse(line)?.payload?.type;
    } catch {
      continue;
    }
    if (STARTED.has(type as string)) return "working";
    if (ENDED.has(type as string)) return "idle";
  }
  return "idle";
}

/** The Codex process in a terminal working in `cwd`, if exactly one is (two would be a guess). */
export function terminalFor(cwd: string | undefined, processes: Process[]): Process | undefined {
  if (!cwd) return undefined;
  const byPid = new Map(processes.map((p) => [p.pid, p]));
  const matches = processes.filter(
    (p) => p.name === "codex" && p.tty && p.cwd === cwd && byPid.get(p.ppid)?.name !== "codex",
  );
  return matches.length === 1 ? matches[0] : undefined;
}

/**
 * Each terminal's thread: the CLI thread in its folder updated last, if that was since the process started (a
 * `codex` just started, before its first message, has none yet; older threads in the folder were other runs).
 */
export function liveCliThreads(threads: Thread[], processes: Process[]): Map<string, Process> {
  const latest = new Map<number, { thread: Thread; terminal: Process }>();
  for (const thread of threads) {
    if (thread.source !== "cli" || thread.updatedAt === undefined) continue;
    const terminal = terminalFor(thread.cwd, processes);
    if (!terminal || thread.updatedAt < terminal.startedAt) continue;
    const current = latest.get(terminal.pid);
    if (!current || thread.updatedAt > current.thread.updatedAt!) latest.set(terminal.pid, { thread, terminal });
  }
  return new Map([...latest.values()].map(({ thread, terminal }) => [thread.id, terminal]));
}

/** Threads with a live host, as agents; `statuses` maps a thread id to its rollout's status (idle if none). */
export function toAgents(
  threads: Thread[],
  statuses: Map<string, AgentStatus>,
  processes: Process[],
  appRunning: boolean,
): Agent[] {
  const terminals = liveCliThreads(threads, processes);
  return threads.flatMap((thread): Agent[] => {
    let host: Host;
    if (thread.source === "cli") {
      const terminal = terminals.get(thread.id);
      if (!terminal) return [];
      host = { kind: "process", pid: terminal.pid, tty: terminal.tty };
    } else {
      if (!appRunning || (thread.originator && thread.originator !== APP_ORIGINATOR)) return [];
      host = { kind: "link", bundleId: CODEX_APP, url: `codex://threads/${thread.id}` };
    }
    const status = statuses.get(thread.id) ?? "idle";
    return [
      {
        key: `codex:${thread.id}`,
        source: codex.id,
        product: "Codex",
        id: thread.id,
        title: firstLine(thread.title) ?? "Codex",
        cwd: thread.cwd,
        status,
        since: thread.updatedAt,
        activeAt: status === "idle" ? thread.updatedAt : undefined,
        host,
        resumeCommand: `codex resume ${thread.id}`,
      },
    ];
  });
}

/** A missing rollout reads as idle; any other failure to read it is reported. */
const noTail = (platform: Platform) => (error: unknown) => {
  platform.reportError(error, "agents: codex rollout");
  return "";
};

const firstLine = (text?: string) => text?.split("\n")[0]?.trim().slice(0, 80) || undefined;

export const codex: AgentSource = {
  id: "codex",
  list: async ({ platform, apps, processes, now }: AgentContext) => {
    const appRunning = apps.some((a) => a.bundleId === CODEX_APP);
    const cliRunning = processes.some((p) => p.name === "codex" && p.tty);
    if (!appRunning && !cliRunning) return [];
    const dir = `${platform.homeDir()}/${DIR}`;
    const db = threadsDb(await platform.listDir(dir));
    // Codex runs, so it keeps a thread database: without one, a new Codex moved or renamed it.
    if (!db) {
      platform.reportError(new Error("Codex runs but ~/.codex has no state_N.sqlite"), "agents: codex db");
      return [];
    }
    const path = `${dir}/${db}`;
    const since = now - RECENT_MS;
    // The schema is Codex's own and grows often: if the full query fails, fall back to the original columns;
    // if that fails too, no Codex agents rather than an error, but reported: Codex changed its schema.
    const rows = await platform
      .querySqlite(path, threadsQuery(since))
      .catch(() => platform.querySqlite(path, baseThreadsQuery(since)))
      .catch((error: unknown) => {
        platform.reportError(error, "agents: codex threads");
        return [];
      });
    const threads = parseThreads(rows);
    if (rows.length > 0 && threads.length === 0) {
      platform.reportError(new Error("Codex threads have no id"), "agents: codex threads");
    }
    // Each tail becomes its status as soon as it's read: up to 50 tails of 256 KB held together would take a big
    // share of the extension's 100 MB JS heap (docs/PERFORMANCE.md).
    const statuses = new Map(
      await Promise.all(
        threads.map(
          async (t) =>
            [
              t.id,
              statusOf(t.rollout ? await platform.readTail(t.rollout, TAIL_BYTES).catch(noTail(platform)) : ""),
            ] as const,
        ),
      ),
    );
    return toAgents(threads, statuses, processes, appRunning);
  },
};
