import * as fs from "fs/promises";
import * as path from "path";
import type { Category, Stranded } from "./focusSetup.ts";
import type { PendingStart, Session } from "./types.ts";

export type SyncState = {
  version: 1;
  cursor: number | null;
  pending: PendingStart[];
  streamOffset: number;
  deleted: number[];
  goalBlocks: Record<string, GoalBlocks>;
};

export type GoalBlocks = {
  categories: Category[];
  mode: "block" | "allow";
  skipped: Stranded[];
};

export type SaveRefusal =
  { ok: false; reason: "collision"; start: number } | { ok: false; reason: "missing"; start: number };

export type SaveResult = { ok: true } | SaveRefusal;

const EMPTY_STATE: SyncState = {
  version: 1,
  cursor: null,
  pending: [],
  streamOffset: 0,
  deleted: [],
  goalBlocks: {},
};

function parseGoalBlocks(value: unknown): Record<string, GoalBlocks> {
  if (!value || typeof value !== "object") return {};

  const categories = (raw: unknown): Category[] =>
    (Array.isArray(raw) ? raw : []).flatMap((c) => {
      if (typeof c === "string") return [{ id: c, title: c }];
      if (!c || typeof c !== "object") return [];
      const row = c as Partial<Category>;
      return typeof row.id === "string"
        ? [{ id: row.id, title: typeof row.title === "string" ? row.title : row.id }]
        : [];
    });

  const stranded = (raw: unknown): Stranded[] =>
    (Array.isArray(raw) ? raw : []).flatMap((s) => {
      if (typeof s === "string") return [{ id: s, title: s, app: true }];
      if (!s || typeof s !== "object") return [];
      const row = s as Partial<Stranded>;
      return typeof row.id === "string"
        ? [{ id: row.id, title: typeof row.title === "string" ? row.title : row.id, app: row.app === true }]
        : [];
    });

  const out: Record<string, GoalBlocks> = {};
  for (const [goal, raw] of Object.entries(value as Record<string, unknown>)) {
    if (!raw || typeof raw !== "object") continue;
    const row = raw as Partial<GoalBlocks>;
    out[goal] = {
      categories: categories(row.categories),
      mode: row.mode === "allow" ? "allow" : "block",
      skipped: stranded(row.skipped),
    };
  }
  return out;
}

function parsePending(value: unknown): PendingStart[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((raw) => {
    if (!raw || typeof raw !== "object") return [];
    const row = raw as Partial<PendingStart>;
    if (typeof row.at !== "number" || !Number.isFinite(row.at) || typeof row.goal !== "string") return [];
    const planned = typeof row.planned === "number" && row.planned > 0 ? { planned: row.planned } : {};
    return [{ at: row.at, goal: row.goal, ...planned }];
  });
}

const DELETED_HORIZON_MS = 90 * 24 * 60 * 60 * 1000;

const DELETED_CAP = 1000;

export function pruneDeleted(deleted: number[], now: number = Date.now()): number[] {
  const kept = [...new Set(deleted)].filter((start) => start > now - DELETED_HORIZON_MS).sort((a, b) => a - b);
  return kept.length > DELETED_CAP ? kept.slice(kept.length - DELETED_CAP) : kept;
}

const MAX_TIMESTAMP = 8.64e15;

export const MAX_NOTES = 500;

const LOCK_STALE_MS = 10_000;
const LOCK_HEARTBEAT_MS = 2_000;
const LOCK_WAIT_MS = 5_000;

let tmpSeq = 0;
const scratchFor = (target: string) => `${target}.${process.pid}.${Date.now()}.${tmpSeq++}.tmp`;

export interface SessionStore {
  all(): Promise<Session[]>;
  add(sessions: Session[]): Promise<number>;
  saveSession(input: { previousStart?: number; session: Session }): Promise<SaveResult>;
  remove(start: number): Promise<void>;
  readState(): Promise<SyncState>;
  mutateState(fn: (current: SyncState) => SyncState): Promise<SyncState>;
  writeState(state: SyncState): Promise<void>;
  count(): Promise<number>;
}

export function parseSession(value: unknown): Session | null {
  if (!value || typeof value !== "object") return null;
  const s = value as Record<string, unknown>;
  if (typeof s.start !== "number" || !Number.isFinite(s.start)) return null;
  if (Math.abs(s.start) > MAX_TIMESTAMP) return null;
  if (typeof s.duration !== "number" || !Number.isFinite(s.duration)) return null;
  if (typeof s.goal !== "string") return null;
  const source = s.source === "timestamps" || s.source === "reported" ? s.source : "manual";
  return {
    start: s.start,
    goal: s.goal,
    duration: s.duration,
    source,
    ...(typeof s.planned === "number" && Number.isFinite(s.planned) && s.planned > 0 ? { planned: s.planned } : {}),
    ...(countField(s.pauses) !== undefined ? { pauses: countField(s.pauses) } : {}),
    ...(countField(s.blocks) !== undefined ? { blocks: countField(s.blocks) } : {}),
    ...(parseSites(s.sites) ? { sites: parseSites(s.sites) } : {}),
    ...(parseNotes(s.notes) ? { notes: parseNotes(s.notes) } : {}),
  };
}

function parseNotes(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const notes = value.trim().slice(0, MAX_NOTES);
  return notes || undefined;
}

function countField(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : undefined;
}

function parseSites(value: unknown): Record<string, number> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const sites: Record<string, number> = {};
  for (const [name, n] of Object.entries(value as Record<string, unknown>)) {
    const hits = countField(n);
    if (name && hits) sites[name] = hits;
  }
  return Object.keys(sites).length ? sites : undefined;
}

export class LocalSessionStore implements SessionStore {
  private queue: Promise<unknown> = Promise.resolve();

  private readonly dir: string;

  constructor(dir: string) {
    this.dir = dir;
  }

  private lock<T>(op: () => Promise<T>): Promise<T> {
    const locked = () => this.withFileLock(op);
    const run = this.queue.then(locked, locked);
    this.queue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  // Each Raycast command runs in its own process, so the in-process queue alone cannot
  // order a menu-bar append against a view's read-then-rewrite. A lock file does. The holder
  // writes its token into the file and touches it every LOCK_HEARTBEAT_MS, so only a lock
  // nobody touched for LOCK_STALE_MS is taken over. Takeover renames the stale file, which a
  // single contender wins, and release removes the lock only while it still carries this
  // holder's token.
  // ponytail: a process suspended mid-write for longer than LOCK_STALE_MS can still overlap
  // the next holder; closing that needs fcntl range locks, which Node does not expose.
  private async withFileLock<T>(op: () => Promise<T>): Promise<T> {
    await this.ensureDir();
    const lock = this.file("store.lock");
    const token = `${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}`;
    const deadline = Date.now() + LOCK_WAIT_MS;
    for (;;) {
      try {
        await fs.writeFile(lock, token, { flag: "wx" });
        break;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
        const touched = (await fs.stat(lock).catch(() => null))?.mtimeMs ?? Date.now();
        if (Date.now() - touched > LOCK_STALE_MS) {
          const claim = `${lock}.${token}.stale`;
          await fs.rename(lock, claim).then(
            () => fs.rm(claim, { force: true }),
            () => undefined,
          );
          continue;
        }
        if (Date.now() > deadline) throw new Error("Another Foqus command is writing sessions. Try again.");
        await new Promise((resolve) => setTimeout(resolve, 25 + Math.random() * 50));
      }
    }
    const heartbeat = setInterval(() => {
      const now = new Date();
      fs.utimes(lock, now, now).catch(() => undefined);
    }, LOCK_HEARTBEAT_MS);
    heartbeat.unref();
    try {
      return await op();
    } finally {
      clearInterval(heartbeat);
      if ((await fs.readFile(lock, "utf8").catch(() => "")) === token) await fs.rm(lock, { force: true });
    }
  }

  private file(name: string): string {
    return path.join(this.dir, name);
  }

  private sessionsPath(): string {
    return this.file("sessions.jsonl");
  }

  private statePath(): string {
    return this.file("state.json");
  }

  private async ensureDir(): Promise<void> {
    await fs.mkdir(path.dirname(this.sessionsPath()), { recursive: true });
  }

  private async readSessions(): Promise<Session[]> {
    let raw: string;
    try {
      raw = await fs.readFile(this.sessionsPath(), "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException)?.code === "ENOENT") return [];
      throw error;
    }

    const seen = new Set<number>();
    const sessions: Session[] = [];
    for (const line of raw.split("\n")) {
      if (!line.trim()) continue;
      let parsed: unknown;
      try {
        parsed = JSON.parse(line);
      } catch {
        continue;
      }
      const session = parseSession(parsed);
      if (!session) continue;
      if (seen.has(session.start)) continue;
      seen.add(session.start);
      sessions.push(session);
    }
    sessions.sort((a, b) => a.start - b.start);
    return sessions;
  }

  async all(): Promise<Session[]> {
    return this.readSessions();
  }

  async add(sessions: Session[]): Promise<number> {
    if (!sessions.length) return 0;
    return this.lock(async () => {
      const existing = await this.readSessions();
      const seen = new Set([...existing.map((s) => s.start), ...(await this.readState()).deleted]);

      const fresh = sessions.filter((s) => {
        if (seen.has(s.start)) return false;
        seen.add(s.start);
        return true;
      });
      if (!fresh.length) return 0;

      await this.ensureDir();
      await fs.appendFile(this.sessionsPath(), fresh.map((s) => JSON.stringify(s)).join("\n") + "\n", "utf8");

      return fresh.length;
    });
  }

  private async rewrite(sessions: Session[]): Promise<void> {
    await this.ensureDir();
    const target = this.sessionsPath();
    const tmp = scratchFor(target);
    await fs.writeFile(tmp, sessions.map((s) => JSON.stringify(s)).join("\n") + (sessions.length ? "\n" : ""), "utf8");
    await fs.rename(tmp, target);
  }

  async saveSession(input: { previousStart?: number; session: Session }): Promise<SaveResult> {
    return this.lock(async () => {
      const prev = input.previousStart;
      const next = input.session;
      const sessions = await this.readSessions();
      const state = await this.readState();

      if (prev !== undefined && !sessions.some((s) => s.start === prev)) {
        return { ok: false, reason: "missing", start: prev };
      }
      if (next.start !== prev && sessions.some((s) => s.start === next.start)) {
        return { ok: false, reason: "collision", start: next.start };
      }

      const kept = sessions.filter((s) => s.start !== prev && s.start !== next.start);
      await this.rewrite([...kept, next].sort((a, b) => a.start - b.start));

      const deleted = new Set(state.deleted);
      if (prev !== undefined && prev !== next.start) deleted.add(prev);
      deleted.delete(next.start);

      await this.writeState({ ...state, deleted: pruneDeleted([...deleted]) });

      return { ok: true };
    });
  }

  async remove(start: number): Promise<void> {
    await this.lock(async () => {
      const sessions = await this.readSessions();
      await this.rewrite(sessions.filter((s) => s.start !== start));
      const state = await this.readState();
      await this.writeState({ ...state, deleted: pruneDeleted([...state.deleted, start]) });
    });
  }

  async mutateState(fn: (current: SyncState) => SyncState): Promise<SyncState> {
    return this.lock(async () => {
      const next = fn(await this.readState());
      await this.writeState(next);
      return next;
    });
  }

  async readState(): Promise<SyncState> {
    try {
      const raw = await fs.readFile(this.statePath(), "utf8");
      const parsed = JSON.parse(raw) as Partial<SyncState>;
      return {
        version: 1,
        cursor: typeof parsed.cursor === "number" ? parsed.cursor : null,
        pending: parsePending(parsed.pending),
        streamOffset: typeof parsed.streamOffset === "number" && parsed.streamOffset >= 0 ? parsed.streamOffset : 0,
        deleted: Array.isArray(parsed.deleted) ? parsed.deleted.filter((n) => typeof n === "number") : [],
        goalBlocks: parseGoalBlocks(parsed.goalBlocks),
      };
    } catch {
      return { ...EMPTY_STATE };
    }
  }

  async writeState(state: SyncState): Promise<void> {
    await this.ensureDir();
    const target = this.statePath();
    const tmp = scratchFor(target);
    await fs.writeFile(tmp, JSON.stringify(state, null, 2), "utf8");
    await fs.rename(tmp, target);
  }

  async count(): Promise<number> {
    return (await this.all()).length;
  }
}
