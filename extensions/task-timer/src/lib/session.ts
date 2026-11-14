import { environment } from "@raycast/api";
import { open, readFile, rename, stat, unlink, writeFile, type FileHandle } from "node:fs/promises";
import path from "node:path";
import { createHistoryEntry, parseHistory, type HistoryEntry } from "./history-entry";
import { createSession, normalizeSession, type TaskSession } from "./timer";

const SESSION_FILE = path.join(environment.supportPath, "menu-bar-session.json");
const HISTORY_FILE = path.join(environment.supportPath, "task-history.json");
const LOCK_FILE = path.join(environment.supportPath, "task-timer-state.lock");
const LOCK_TIMEOUT_MS = 5_000;
const STALE_LOCK_MS = 30_000;

function isMissing(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

async function pause(milliseconds: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function acquireLock(): Promise<FileHandle> {
  const deadline = Date.now() + LOCK_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      return await open(LOCK_FILE, "wx", 0o600);
    } catch (error) {
      if (!(error instanceof Error) || !("code" in error) || error.code !== "EEXIST") throw error;
      try {
        const lock = await stat(LOCK_FILE);
        if (Date.now() - lock.mtimeMs > STALE_LOCK_MS) {
          await unlink(LOCK_FILE);
          continue;
        }
      } catch (statError) {
        if (!isMissing(statError)) throw statError;
      }
      await pause(50);
    }
  }
  throw new Error("Task Timer is busy. Please try again.");
}

async function withStateLock<T>(operation: () => Promise<T>): Promise<T> {
  const lock = await acquireLock();
  try {
    return await operation();
  } finally {
    await lock.close();
    await unlink(LOCK_FILE).catch((error: unknown) => {
      if (!isMissing(error)) throw error;
    });
  }
}

async function readSessionFile(now = Date.now()): Promise<TaskSession | undefined> {
  try {
    return normalizeSession(JSON.parse(await readFile(SESSION_FILE, "utf8")), now);
  } catch (error) {
    if (isMissing(error)) return undefined;
    throw error;
  }
}

async function writeJson(file: string, value: unknown): Promise<void> {
  const temporary = `${file}.${process.pid}.${crypto.randomUUID()}.tmp`;
  try {
    await writeFile(temporary, JSON.stringify(value), { mode: 0o600 });
    await rename(temporary, file);
  } finally {
    await unlink(temporary).catch((error: unknown) => {
      if (!isMissing(error)) throw error;
    });
  }
}

async function removeSessionFile(): Promise<void> {
  await unlink(SESSION_FILE).catch((error: unknown) => {
    if (!isMissing(error)) throw error;
  });
}

async function appendHistory(entry: HistoryEntry): Promise<void> {
  let history: HistoryEntry[] = [];
  try {
    history = parseHistory(await readFile(HISTORY_FILE, "utf8"));
  } catch (error) {
    if (!isMissing(error)) throw error;
  }
  if (history.some((item) => item.id === entry.id)) return;
  await writeJson(HISTORY_FILE, [...history, entry]);
}

async function reconcile(now: number): Promise<{ session?: TaskSession; completed?: HistoryEntry }> {
  const session = await readSessionFile(now);
  if (!session || session.status === "finished" || (session.status === "running" && session.endsAt <= now)) {
    if (!session) return {};
    const completed = createHistoryEntry(session, "time-limit", session.endsAt);
    await appendHistory(completed);
    await removeSessionFile();
    return { completed };
  }
  return { session };
}

export async function reconcileSession(now = Date.now()): Promise<{ session?: TaskSession; completed?: HistoryEntry }> {
  return withStateLock(() => reconcile(now));
}

export async function startTask(task: string, minutes: string, now = Date.now()): Promise<TaskSession> {
  return withStateLock(async () => {
    const { session } = await reconcile(now);
    if (session) {
      throw new Error(
        `A task is already active: ${session.taskName}. End it from the menu bar before starting another.`,
      );
    }
    const created = createSession(task, minutes, now);
    await writeJson(SESSION_FILE, created);
    return created;
  });
}

export async function discardTask(id: string): Promise<void> {
  await withStateLock(async () => {
    const session = await readSessionFile();
    if (session && (session.id ?? String(session.startedAt)) === id) await removeSessionFile();
  });
}

export async function pauseTask(now = Date.now()): Promise<TaskSession | undefined> {
  return withStateLock(async () => {
    const { session } = await reconcile(now);
    if (!session || session.status !== "running") return session;
    const paused: TaskSession = {
      ...session,
      status: "paused",
      pausedAt: now,
      pausedRemainingMs: Math.max(1, session.endsAt - now),
    };
    await writeJson(SESSION_FILE, paused);
    return paused;
  });
}

export async function resumeTask(now = Date.now()): Promise<TaskSession | undefined> {
  return withStateLock(async () => {
    const { session } = await reconcile(now);
    if (!session || session.status !== "paused") return session;
    const pausedAt = session.pausedAt ?? now;
    const resumed: TaskSession = {
      ...session,
      status: "running",
      endsAt: now + (session.pausedRemainingMs ?? 0),
      totalPausedMs: (session.totalPausedMs ?? 0) + Math.max(0, now - pausedAt),
    };
    delete resumed.pausedAt;
    delete resumed.pausedRemainingMs;
    await writeJson(SESSION_FILE, resumed);
    return resumed;
  });
}

export async function extendTask(minutes: number, now = Date.now()): Promise<TaskSession | undefined> {
  return withStateLock(async () => {
    const { session } = await reconcile(now);
    if (!session) return undefined;
    const extended: TaskSession = {
      ...session,
      durationMinutes: session.durationMinutes + minutes,
      endsAt: session.endsAt + minutes * 60_000,
    };
    if (extended.pausedRemainingMs !== undefined) extended.pausedRemainingMs += minutes * 60_000;
    await writeJson(SESSION_FILE, extended);
    return extended;
  });
}

export async function endTask(now = Date.now()): Promise<HistoryEntry | undefined> {
  return withStateLock(async () => {
    const { session, completed } = await reconcile(now);
    if (!session) return completed;
    const entry = createHistoryEntry(session, "manual", now);
    await appendHistory(entry);
    await removeSessionFile();
    return entry;
  });
}
