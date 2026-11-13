import { mkdir, readFile, rename, rm, stat, unlink, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";

// The session-status hook that writes this state lives in packages/codex-raycast
// of this monorepo (installed with `npx codex-raycast setup`). This module only
// reads the shared states.json and flips `unread` when a session is opened from
// Raycast. The states schema and the lock protocol must stay compatible with the
// hook; the contract tests in test/contract enforce that.

export const sessionStatesFileName = "states.json";
const MAX_SESSION_STATES = 500;

export type SessionStatus = "working" | "done";

export interface SessionState {
  status: SessionStatus;
  unread: boolean;
  updatedAt: string;
  turnId: string;
  cwd: string;
  source: string;
}

export type SessionStateMap = Record<string, SessionState>;

export function sessionStateDir(): string {
  const override = process.env.RAYCAST_CODEX_STATE_DIR?.trim();
  if (override) return override;
  const root = process.env.XDG_STATE_HOME?.trim() || join(homedir(), ".local", "state");
  return join(root, "raycast-codex-sessions");
}

export function sessionStatesPath(): string {
  return join(sessionStateDir(), sessionStatesFileName);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSessionStatus(value: unknown): value is SessionStatus {
  return value === "working" || value === "done";
}

function isSessionState(value: unknown): value is SessionState {
  if (!isObject(value)) return false;
  return (
    isSessionStatus(value.status) &&
    typeof value.unread === "boolean" &&
    typeof value.updatedAt === "string" &&
    typeof value.turnId === "string" &&
    typeof value.cwd === "string" &&
    typeof value.source === "string"
  );
}

function sessionTimestamp(state: SessionState): number {
  const timestamp = Date.parse(state.updatedAt);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function pruneSessionStates(states: SessionStateMap): SessionStateMap {
  const entries = Object.entries(states);
  if (entries.length <= MAX_SESSION_STATES) return states;
  entries.sort(([, first], [, second]) => sessionTimestamp(second) - sessionTimestamp(first));
  return Object.fromEntries(entries.slice(0, MAX_SESSION_STATES));
}

function parseSessionStates(text: string): SessionStateMap {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return {};
  }
  if (!isObject(parsed)) return {};
  return pruneSessionStates(
    Object.fromEntries(Object.entries(parsed).filter(([, value]) => isSessionState(value))) as SessionStateMap,
  );
}

export async function loadSessionStates(): Promise<SessionStateMap> {
  try {
    return parseSessionStates(await readFile(sessionStatesPath(), "utf8"));
  } catch {
    return {};
  }
}

async function atomicWrite(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.${Date.now()}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, content, "utf8");
    await rename(temporary, path);
  } finally {
    try {
      await unlink(temporary);
    } catch {
      // The rename completed and the temporary file is already gone.
    }
  }
}

// Directory-based lock shared with the Python hook (mkdir is atomic on APFS;
// stale locks are reclaimed after 30 seconds).
async function withStateLock<T>(callback: () => Promise<T>): Promise<T> {
  const lockPath = `${sessionStatesPath()}.lock`;
  await mkdir(dirname(lockPath), { recursive: true });
  let acquired = false;
  for (let attempt = 0; attempt < 200; attempt += 1) {
    try {
      await mkdir(lockPath);
      acquired = true;
      break;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      try {
        const lock = await stat(lockPath);
        if (Date.now() - lock.mtimeMs > 30_000) {
          await rm(lockPath, { force: true, recursive: true });
          continue;
        }
      } catch {
        // The other process released the lock between checks.
      }
      await delay(5);
    }
  }
  if (!acquired) throw new Error(`Unable to acquire session state lock: ${lockPath}`);
  try {
    return await callback();
  } finally {
    await rm(lockPath, { force: true, recursive: true });
  }
}

async function updateSessionState(sessionId: string, update: (states: SessionStateMap) => boolean): Promise<void> {
  await withStateLock(async () => {
    const states = await loadSessionStates();
    if (!update(states)) return;
    await atomicWrite(sessionStatesPath(), `${JSON.stringify(pruneSessionStates(states))}\n`);
  });
}

export async function markSessionSeen(sessionId: string): Promise<void> {
  await updateSessionState(sessionId, (states) => {
    const state = states[sessionId];
    if (!state || !state.unread) return false;
    state.unread = false;
    return true;
  });
}

export async function clearStaleSessionState(sessionId: string): Promise<void> {
  await updateSessionState(sessionId, (states) => {
    if (!(sessionId in states)) return false;
    delete states[sessionId];
    return true;
  });
}
