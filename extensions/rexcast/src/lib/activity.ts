import { LocalStorage } from "@raycast/api";
import {
  aggregate,
  readBlock,
  statusOf,
  step,
  type Event,
  type ProcessInfo,
  type Reading,
  type Status,
  type StatusRecord,
} from "./block-state";
import { blockCall, inspectSession, listSessions, rexQuiet } from "./rex";
import { nextStore, type Store } from "./store";

export type { Store };
export type SessionActivity = {
  session_id: string;
  label: string;
  status: Status;
  /** What it is doing: the program's own status message, or the foreground process. */
  detail: string;
  windows: { window_id: string; label: string; active: boolean; panes: number }[];
};
export type ServerInfo = { version: string; pid: number; startedAt: string; tailscale?: string };
export type Notice = { label: string; event: Event; kind?: string };
export type Poll = { sessions: SessionActivity[]; server: ServerInfo | null; notices: Notice[] };

const STORE_KEY = "activity-store-v3";
const CACHE_KEY = "activity-cache-v4";
const MIN_GAP_MS = 8_000;

type Cache = { ts: number; sessions: SessionActivity[]; server: ServerInfo | null };

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    return JSON.parse((await LocalStorage.getItem<string>(key)) ?? "") as T;
  } catch {
    return fallback;
  }
}

/** null = server stopped. Never autostarts it just to look. */
async function serverInfo(): Promise<ServerInfo | null> {
  try {
    const j = JSON.parse(await rexQuiet("server", "status", "--json"));
    return { version: j.rex_version, pid: j.pid, startedAt: j.started_at, tailscale: j.tailscale?.dns_name };
  } catch {
    return null;
  }
}

/** Two small calls per pane (no scrollback), made in parallel. null = could not read it. */
async function readTerminal(session: string, block: string): Promise<Reading | null> {
  try {
    const [proc, status] = await Promise.all([
      blockCall<ProcessInfo>(session, block, "process", true),
      blockCall<{ records?: StatusRecord[] }>(session, block, "program_status", true),
    ]);
    const reading = readBlock(proc, status.records);
    if (!reading.detail && reading.state === "idle") {
      reading.detail =
        (await blockCall<{ title?: string }>(session, block, "title", true).catch(() => ({ title: undefined })))
          .title || undefined;
    }
    return reading;
  } catch {
    return null;
  }
}

async function sessionActivity(
  s: { session_id: string; label: string },
  prevStore: Store,
  store: Store,
  notices: Notice[],
): Promise<SessionActivity> {
  const { windows, active } = await inspectSession(s.session_id, true);
  const blocks = windows.flatMap((w) => w.blocks).filter((b) => b.flavor?.startsWith("com.superlogical.terminal"));
  const readings = await Promise.all(blocks.map((b) => readTerminal(s.session_id, b.block_id)));

  const statuses: { status: Status; detail: string }[] = [];
  blocks.forEach((b, i) => {
    const key = `${s.session_id}|${b.block_id}`;
    const reading = readings[i];
    // A failed read is not "idle": keep the previous state instead of guessing.
    if (!reading) {
      // ...and the session still shows what that pane was last doing, so a blocked pane is not hidden.
      const last = prevStore[key];
      if (last) {
        store[key] = last;
        statuses.push({ status: statusOf(last), detail: "" });
      }
      return;
    }
    const { stored, event } = step(prevStore[key], reading);
    store[key] = stored;
    if (event) notices.push({ label: s.label, event, kind: reading.kind });
    statuses.push({ status: statusOf(stored), detail: reading.detail ?? "" });
  });

  const status = aggregate(statuses.map((x) => x.status));
  return {
    session_id: s.session_id,
    label: s.label,
    status,
    detail:
      statuses.find((x) => x.status === status && x.detail)?.detail ?? statuses.find((x) => x.detail)?.detail ?? "",
    windows: windows.map((w) => ({
      window_id: w.window_id,
      label: w.label,
      active: w.window_id === active,
      panes: w.blocks.length,
    })),
  };
}

export async function poll(now = Date.now()): Promise<Poll> {
  const cache = await readJson<Cache | null>(CACHE_KEY, null);
  // Opening the menu relaunches the command: don't advance state if the last read is recent.
  if (cache && now - cache.ts < MIN_GAP_MS) return { sessions: cache.sessions, server: cache.server, notices: [] };

  const prevStore = await readJson<Store>(STORE_KEY, {});
  const fresh: Store = {};
  const notices: Notice[] = [];
  const failed: string[] = [];
  let listed: string[] = [];
  const cached = new Map((cache?.sessions ?? []).map((s) => [s.session_id, s]));

  // Everything in parallel: server status, sessions and every pane.
  const [server, sessions] = await Promise.all([
    serverInfo(),
    listSessions(true)
      .then(async (list) => {
        listed = list.map((s) => s.session_id);
        // A session that closes or fails mid-poll only affects itself: it keeps its last known state.
        const all = await Promise.all(
          list.map((s) =>
            sessionActivity(s, prevStore, fresh, notices).catch(() => {
              failed.push(s.session_id);
              return cached.get(s.session_id) ?? null;
            }),
          ),
        );
        return all.filter((s): s is SessionActivity => s !== null);
      })
      // null = the list itself failed (server stopped, rex missing, a hiccup).
      .catch(() => null),
  ]);

  if (sessions === null) {
    // Nothing was confirmed gone, so the saved activity stays as it is and recovery is not a "first reading".
    const shown = server ? (cache?.sessions ?? []) : [];
    await LocalStorage.setItem(CACHE_KEY, JSON.stringify({ ts: now, sessions: shown, server } satisfies Cache));
    return { sessions: shown, server, notices: [] };
  }

  await LocalStorage.setItem(STORE_KEY, JSON.stringify(nextStore(prevStore, fresh, listed, failed)));
  await LocalStorage.setItem(CACHE_KEY, JSON.stringify({ ts: now, sessions, server } satisfies Cache));
  return { sessions, server, notices };
}

/** Opening a session counts as seeing it: clear its "finished" and "failed" marks. */
export async function markSeen(sessionId: string) {
  const store = await readJson<Store>(STORE_KEY, {});
  for (const k of Object.keys(store)) if (k.startsWith(sessionId + "|")) store[k].unseen = false;
  await LocalStorage.setItem(STORE_KEY, JSON.stringify(store));
  await LocalStorage.removeItem(CACHE_KEY);
}
