import { exec, q } from "./sqlite";
import { DB_PATH } from "./paths";
import { applyEvent, Transition } from "./status";
import { AgentEvent, Attention, Host, Locator, Session, SessionState, SessionTitle, Status } from "./types";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS sessions (
  agent TEXT NOT NULL,
  session_id TEXT NOT NULL,
  host TEXT NOT NULL DEFAULT 'cli',
  title TEXT NOT NULL DEFAULT '',
  cwd TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'idle',
  attention TEXT,
  summary TEXT NOT NULL DEFAULT '',
  locator TEXT NOT NULL DEFAULT '{}',
  subscribed INTEGER NOT NULL DEFAULT 0,
  handled_at INTEGER,
  started_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  transcript_path TEXT NOT NULL DEFAULT '',
  state TEXT NOT NULL DEFAULT '{}',
  revision INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (agent, session_id)
);
CREATE INDEX IF NOT EXISTS sessions_updated ON sessions(updated_at DESC);
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent TEXT NOT NULL,
  session_id TEXT NOT NULL,
  type TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS events_session ON events(agent, session_id, at DESC);
CREATE TABLE IF NOT EXISTS event_receipts (agent TEXT, session_id TEXT, event_key TEXT, PRIMARY KEY(agent, session_id, event_key));
CREATE TABLE IF NOT EXISTS notification_outbox (
  id TEXT NOT NULL, channel TEXT NOT NULL, payload TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at INTEGER NOT NULL DEFAULT 0, lease_until INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(id, channel)
);
CREATE TABLE IF NOT EXISTS source_cursors (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS session_titles (
  agent TEXT NOT NULL, session_id TEXT NOT NULL, title TEXT NOT NULL,
  observed_at INTEGER NOT NULL, source TEXT NOT NULL, PRIMARY KEY(agent,session_id)
);
`;

interface Row {
  agent: string;
  session_id: string;
  host: string;
  title: string;
  cwd: string;
  status: string;
  attention: string | null;
  summary: string;
  locator: string;
  subscribed: number;
  handled_at: number | null;
  started_at: number;
  updated_at: number;
  transcript_path: string;
  state: string;
  revision: number;
  title_observed_at?: number | null;
  title_source?: string | null;
}

const COLUMNS =
  "agent, session_id, host, title, cwd, status, attention, summary, locator, subscribed, handled_at, started_at, updated_at, transcript_path, state, revision";

const READ_SESSIONS = `SELECT ${COLUMNS.split(", ")
  .map((column) => (column === "title" ? "COALESCE(t.title,s.title) AS title" : `s.${column}`))
  .join(", ")},
  t.observed_at AS title_observed_at, t.source AS title_source FROM sessions s LEFT JOIN session_titles t ON s.agent=t.agent AND s.session_id=t.session_id`;

function fromRow(r: Row): Session {
  let locator: Locator = {};
  try {
    locator = JSON.parse(r.locator || "{}");
  } catch {
    locator = {};
  }
  return {
    agent: r.agent,
    sessionId: r.session_id,
    host: (r.host === "app" ? "app" : "cli") as Host,
    title: r.title ?? "",
    ...(r.title_observed_at != null ? { titleObservedAt: r.title_observed_at } : {}),
    ...(r.title_source ? { titleSource: r.title_source } : {}),
    cwd: r.cwd ?? "",
    status: r.status as Status,
    attention: (r.attention as Attention | null) ?? null,
    summary: r.summary ?? "",
    locator,
    subscribed: r.subscribed === 1,
    handledAt: r.handled_at ?? null,
    startedAt: r.started_at,
    updatedAt: r.updated_at,
    transcriptPath: r.transcript_path ?? "",
    state: parseState(r.state),
    revision: r.revision ?? 0,
  };
}

function parseState(value: string): SessionState | undefined {
  try {
    const state = JSON.parse(value);
    return state && typeof state.at === "number" && Array.isArray(state.pending) && Array.isArray(state.resolved) ? state : undefined;
  } catch {
    return undefined;
  }
}

export interface QueuedNotification {
  id: string;
  channel: string;
  payload: string;
  attempts: number;
}

function values(s: Session): string {
  return [
    q(s.agent),
    q(s.sessionId),
    q(s.host),
    q(s.title),
    q(s.cwd),
    q(s.status),
    q(s.attention),
    q(s.summary),
    q(JSON.stringify(s.locator ?? {})),
    q(s.subscribed),
    q(s.handledAt),
    q(s.startedAt),
    q(s.updatedAt),
    q(s.transcriptPath),
    q(JSON.stringify(s.state ?? {})),
    q(s.revision ?? 0),
  ].join(", ");
}

export class Store {
  private ready: Promise<void> | null = null;
  constructor(readonly path: string = DB_PATH) {}

  private init(): Promise<void> {
    if (!this.ready) {
      this.ready = this.initialize();
      this.ready.catch(() => (this.ready = null));
    }
    return this.ready;
  }

  private async initialize(): Promise<void> {
    await exec(this.path, "PRAGMA journal_mode=WAL;");
    await exec(this.path, SCHEMA);
    for (const [name, declaration] of [
      ["state", "TEXT NOT NULL DEFAULT '{}'"],
      ["revision", "INTEGER NOT NULL DEFAULT 0"],
    ]) {
      const columns = await exec<{ name: string }>(this.path, "PRAGMA table_info(sessions);");
      if (columns.some((column) => column.name === name)) continue;
      try {
        await exec(this.path, `ALTER TABLE sessions ADD COLUMN ${name} ${declaration};`);
      } catch (error) {
        const current = await exec<{ name: string }>(this.path, "PRAGMA table_info(sessions);");
        if (!current.some((column) => column.name === name)) throw error;
      }
    }
    // Previous releases inferred completion from Stop. Preserve subscriptions/handled state.
    await exec(
      this.path,
      "UPDATE sessions SET status='ready', revision=revision+1 WHERE agent IN ('claude','codex') AND status='done' AND state='{}';",
    );
  }

  private async run<T = Row>(sql: string): Promise<T[]> {
    await this.init();
    return exec<T>(this.path, sql);
  }

  async get(agent: string, sessionId: string): Promise<Session | undefined> {
    const rows = await this.run(`${READ_SESSIONS} WHERE s.agent=${q(agent)} AND s.session_id=${q(sessionId)};`);
    return rows[0] ? fromRow(rows[0]) : undefined;
  }

  async all(limit = 500): Promise<Session[]> {
    const rows = await this.run(`${READ_SESSIONS} ORDER BY s.updated_at DESC LIMIT ${q(limit)};`);
    return rows.map(fromRow);
  }

  /** Rows that can appear in the inbox or the menu bar. */
  async active(): Promise<Session[]> {
    const rows = await this.run(`${READ_SESSIONS} WHERE s.subscribed=1 AND s.handled_at IS NULL ORDER BY s.updated_at DESC;`);
    return rows.map(fromRow);
  }

  async put(s: Session): Promise<void> {
    await this.run(
      `INSERT INTO sessions (${COLUMNS}) VALUES (${values(s)}) ON CONFLICT(agent,session_id) DO UPDATE SET (${COLUMNS})=(${values(s)}), revision=sessions.revision+1;`,
    );
  }

  /** Apply an adapter event through the state machine and persist it. */
  async record(ev: AgentEvent, options: { channels?: string[]; silent?: boolean } = {}): Promise<Transition | null> {
    for (let attempt = 0; attempt < 16; attempt++) {
      const prev = await this.get(ev.agent, ev.sessionId);
      const receipt = `agent=${q(ev.agent)} AND session_id=${q(ev.sessionId)} AND event_key=${q(ev.eventId)}`;
      if (ev.eventId && (await this.run(`SELECT 1 FROM event_receipts WHERE ${receipt};`)).length) return null;
      const t = applyEvent(prev, ev);
      if (!t) return null;
      t.next.revision = (prev?.revision ?? -1) + 1;
      const allowed = ev.eventId ? ` AND NOT EXISTS (SELECT 1 FROM event_receipts WHERE ${receipt})` : "";
      const write = prev
        ? `UPDATE sessions SET (${COLUMNS})=(${values(t.next)}) WHERE agent=${q(ev.agent)} AND session_id=${q(ev.sessionId)} AND revision=${q(prev.revision ?? 0)}${allowed};`
        : `INSERT OR IGNORE INTO sessions (${COLUMNS}) SELECT ${values(t.next)} WHERE 1${allowed};`;
      const notificationId = `${ev.agent}:${ev.sessionId}:${t.next.revision}`;
      const enqueue =
        t.notify && !options.silent
          ? [...new Set(options.channels ?? [])]
              .map(
                (channel) =>
                  `INSERT OR IGNORE INTO notification_outbox (id,channel,payload) SELECT ${q(notificationId)},${q(channel)},${q(JSON.stringify(t.next))} WHERE (SELECT n FROM applied)=1;`,
              )
              .join("")
          : "";
      const result = await this.run<{ n: number }>(
        `BEGIN IMMEDIATE; ${write} CREATE TEMP TABLE applied AS SELECT changes() AS n;` +
          `INSERT INTO events (agent,session_id,type,summary,at) SELECT ${q(ev.agent)},${q(ev.sessionId)},${q(ev.type)},${q(t.next.summary)},${q(ev.at)} WHERE (SELECT n FROM applied)=1;` +
          (ev.eventId
            ? `INSERT OR IGNORE INTO event_receipts SELECT ${q(ev.agent)},${q(ev.sessionId)},${q(ev.eventId)} WHERE (SELECT n FROM applied)=1;`
            : "") +
          enqueue +
          `DELETE FROM events WHERE at < ${q(ev.at - 30 * 24 * 3600 * 1000)}; SELECT n FROM applied; COMMIT;`,
      );
      if (result[0]?.n === 1) return t;
    }
    throw new Error("Concurrent session updates did not settle; event was not recorded");
  }

  async subscribed(): Promise<Session[]> {
    return (await this.run(`${READ_SESSIONS} WHERE s.subscribed=1;`)).map(fromRow);
  }

  /** Metadata never changes state, activity, subscription or notification receipts. */
  async syncTitles(observations: SessionTitle[]): Promise<SessionTitle[]> {
    const valid = observations.filter((o) => o.title.trim() && Number.isFinite(o.observedAt) && o.observedAt >= 0);
    if (!valid.length) return [];
    if (valid.length > 200) {
      const saved: SessionTitle[] = [];
      for (let index = 0; index < valid.length; index += 200) saved.push(...(await this.syncTitles(valid.slice(index, index + 200))));
      return saved;
    }
    const writes = valid
      .map(
        (o) =>
          `INSERT INTO session_titles (agent,session_id,title,observed_at,source)
       SELECT ${q(o.agent)},${q(o.sessionId)},${q(o.title)},${q(o.observedAt)},${q(o.source)}
       WHERE EXISTS (SELECT 1 FROM sessions WHERE agent=${q(o.agent)} AND session_id=${q(o.sessionId)})
       ON CONFLICT(agent,session_id) DO UPDATE SET title=excluded.title,observed_at=excluded.observed_at,source=excluded.source
       WHERE excluded.observed_at>session_titles.observed_at;`,
      )
      .join("\n");
    const where = valid.map((o) => `(agent=${q(o.agent)} AND session_id=${q(o.sessionId)})`).join(" OR ");
    return this.run<SessionTitle>(`BEGIN IMMEDIATE; ${writes}
      SELECT agent,session_id AS sessionId,title,observed_at AS observedAt,source FROM session_titles WHERE ${where}; COMMIT;`);
  }

  async attachTranscript(agent: string, sessionId: string, path: string): Promise<void> {
    await this.run(
      `UPDATE sessions SET transcript_path=${q(path)}, revision=revision+1 WHERE agent=${q(agent)} AND session_id=${q(sessionId)} AND transcript_path<>${q(path)};`,
    );
  }

  async readCursor<T>(key: string): Promise<T | undefined> {
    const rows = await this.run<{ value: string }>(`SELECT value FROM source_cursors WHERE key=${q(key)};`);
    return rows[0] ? (JSON.parse(rows[0].value) as T) : undefined;
  }

  async writeCursor(key: string, value: unknown): Promise<void> {
    await this.run(`INSERT OR REPLACE INTO source_cursors VALUES (${q(key)},${q(JSON.stringify(value))});`);
  }

  async claimNotifications(now = Date.now()): Promise<QueuedNotification[]> {
    return this.run<QueuedNotification>(
      `UPDATE notification_outbox SET lease_until=${q(now + 60000)} WHERE rowid IN (SELECT rowid FROM notification_outbox WHERE next_attempt_at<=${q(now)} AND lease_until<=${q(now)} LIMIT 1) RETURNING id,channel,payload,attempts;`,
    );
  }

  async finishNotification(job: QueuedNotification, delivered: boolean, now = Date.now()): Promise<void> {
    const where = `id=${q(job.id)} AND channel=${q(job.channel)}`;
    await this.run(
      delivered
        ? `DELETE FROM notification_outbox WHERE ${where};`
        : `UPDATE notification_outbox SET attempts=attempts+1,lease_until=0,next_attempt_at=${q(now + Math.min(3600000, 1000 * 2 ** Math.min(job.attempts, 12)))} WHERE ${where};`,
    );
  }

  async setSubscribed(agent: string, sessionId: string, subscribed: boolean): Promise<void> {
    await this.run(
      `UPDATE sessions SET revision=revision+1, subscribed=${q(subscribed)}${subscribed ? ", handled_at=NULL" : ""} WHERE agent=${q(agent)} AND session_id=${q(sessionId)};`,
    );
  }

  /** Subscribe to a session that may only exist as a transcript on disk (history). */
  async subscribeEntry(s: Session, options: { focused?: boolean } = {}): Promise<void> {
    // A hook may create the row concurrently. Never replace its state with an old history snapshot.
    // A positively identified desktop window can correct old CLI ownership without touching
    // status, timestamps or terminal locators recorded by a newer hook.
    const identity =
      options.focused && s.host === "app"
        ? `, host='app', title=CASE WHEN excluded.title<>'' THEN excluded.title ELSE sessions.title END, ` +
          `locator=json_patch(CASE WHEN json_valid(sessions.locator) THEN sessions.locator ELSE '{}' END, ${q(
            JSON.stringify({
              ...(s.locator.hostId ? { hostId: s.locator.hostId } : {}),
              ...(s.locator.claudeDesktopId ? { claudeDesktopId: s.locator.claudeDesktopId } : {}),
            }),
          )})`
        : "";
    await this.run(
      `INSERT INTO sessions (${COLUMNS}) VALUES (${values({ ...s, subscribed: true, handledAt: null })}) ` +
        `ON CONFLICT(agent, session_id) DO UPDATE SET revision=sessions.revision+1, subscribed=1, handled_at=NULL${identity};`,
    );
    if (options.focused && s.title)
      await this.syncTitles([
        { agent: s.agent, sessionId: s.sessionId, title: s.title, observedAt: s.titleObservedAt ?? Date.now(), source: "focused-window" },
      ]);
  }

  async markHandled(agent: string, sessionId: string, at = Date.now()): Promise<void> {
    await this.run(`UPDATE sessions SET revision=revision+1, handled_at=${q(at)} WHERE agent=${q(agent)} AND session_id=${q(sessionId)};`);
  }

  async unmarkHandled(agent: string, sessionId: string): Promise<void> {
    await this.run(`UPDATE sessions SET revision=revision+1, handled_at=NULL WHERE agent=${q(agent)} AND session_id=${q(sessionId)};`);
  }

  /** "Archive Completed": every finished session leaves the inbox. */
  async archiveDone(at = Date.now(), observed?: Session[]): Promise<number> {
    // The view can recover completed turns from bounded transcript tails even when a
    // pre-install session is still idle in the hook DB. Archive the observed rows only,
    // without persisting inferred state or hiding a newer hook update.
    const snapshots = observed?.filter((s) => s.subscribed && s.handledAt === null && s.status === "done");
    if (snapshots?.length === 0) return 0;
    const state = snapshots
      ? `status IN ('idle','done') AND (${snapshots.map((s) => `(agent=${q(s.agent)} AND session_id=${q(s.sessionId)} AND updated_at=${q(s.updatedAt)})`).join(" OR ")})`
      : "status='done'";
    const rows = await this.run<{ n: number }>(
      `UPDATE sessions SET revision=revision+1, handled_at=${q(at)} WHERE subscribed=1 AND ${state} AND handled_at IS NULL; SELECT changes() AS n;`,
    );
    return rows[0]?.n ?? 0;
  }
}
