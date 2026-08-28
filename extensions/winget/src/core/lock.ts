/**
 * Cross-command mutex with crash recovery — the global WinGet mutation lock.
 *
 * WinGet allows exactly one mutation at a time, and Raycast launches a fresh
 * worker per command invocation with no dedup, so mutual exclusion lives here,
 * in a lock file shared via the support directory.
 *
 * Protocol:
 * - Acquire: exclusive create (`wx`) of the lock file with the full record in a
 *   single write; EEXIST means busy, EPERM/EBUSY are transient and retried.
 * - Heartbeat (every HEARTBEAT_MS): read, VERIFY the record is ours, atomically
 *   rewrite with a fresh timestamp. A missing or foreign record means we were
 *   reaped — the caller must self-fence (kill its winget child, mark the
 *   operation interrupted, and NOT touch the lock).
 * - Stale: no heartbeat for STALE_MS, or a heartbeat too far in the future
 *   (backward clock step with a dead holder).
 * - Reap (acquirers only): atomically RENAME the stale lock to a tombstone —
 *   exactly one reaper can win the rename — then create the new lock. Before
 *   reaping, if the dead holder registered a winget PID that is still a live
 *   winget.exe, the previous mutation is still running: the lock is NOT granted.
 * - Release: read, verify ours, unlink. Never blind-delete.
 */

import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { closeSync, ftruncateSync, openSync, renameSync, writeSync } from "node:fs";

import { deleteFileQuiet, fileMtime, readJson, withRetries } from "./files";

const HEARTBEAT_MS = 2_000;
/** Generous: a spuriously reaped live operation costs far more than a slow crash-reap. */
const STALE_MS = 30_000;
/** Heartbeats this far in the future indicate a dead holder across a clock step. */
const FUTURE_SKEW_MS = 5_000;
/** A lock file that exists but cannot be parsed is held (conservative) while younger than this. */
const UNREADABLE_GRACE_MS = 2_000;

interface LockRecord {
  opId: string;
  kind: string;
  title: string;
  startedAt: number;
  heartbeatAt: number;
  /** PID of the spawned winget.exe, registered as soon as it is known. */
  wingetPid: number | null;
}

type LockInspection =
  | { state: "free" }
  | { state: "held"; record: LockRecord | null }
  | { state: "stale"; record: LockRecord | null };

type AcquireResult =
  | { status: "acquired"; reaped: LockRecord | null }
  | { status: "busy"; holder: LockRecord | null }
  | { status: "orphan-winget-running"; holder: LockRecord };

interface LockEnvironment {
  now: () => number;
  /** True when `pid` is a live winget process (name-checked to defeat PID reuse). */
  isWingetProcessAlive: (pid: number) => boolean;
  /** Staleness override for short-lived locks (default STALE_MS). */
  staleMs?: number;
}

function defaultIsWingetProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ESRCH") {
      return false;
    }
    // EPERM etc.: the PID exists; fall through to the name check.
  }
  try {
    const output = execFileSync("tasklist", ["/FI", `PID eq ${pid}`, "/FO", "CSV", "/NH"], {
      encoding: "utf-8",
      timeout: 5_000,
      windowsHide: true,
    });
    return /winget\.exe/i.test(output);
  } catch {
    // tasklist unavailable/failed: assume alive (conservative — keeps mutual exclusion).
    return true;
  }
}

const DEFAULT_ENV: LockEnvironment = {
  now: () => Date.now(),
  isWingetProcessAlive: defaultIsWingetProcessAlive,
};

function isStale(record: LockRecord, now: number, staleMs: number): boolean {
  return record.heartbeatAt < now - staleMs || record.heartbeatAt > now + FUTURE_SKEW_MS;
}

/** Create the lock file exclusively with the full record in a single write. */
function createExclusive(lockPath: string, record: LockRecord): "created" | "exists" {
  try {
    const fd = withRetries(() => openSync(lockPath, "wx"));
    try {
      writeSync(fd, JSON.stringify(record), null, "utf-8");
    } finally {
      closeSync(fd);
    }
    return "created";
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "EEXIST") {
      return "exists";
    }
    // Transient errors that survived retries (e.g. delete-pending after a
    // reaper's unlink, AV holding the name): report busy rather than crash —
    // mutual exclusion is preserved, the caller may simply try again later.
    if (code === "EPERM" || code === "EBUSY" || code === "EACCES") {
      return "exists";
    }
    throw error;
  }
}

/** Non-destructive look at the lock, for advisory checks and views. */
function inspectLock(lockPath: string, env: LockEnvironment = DEFAULT_ENV): LockInspection {
  const record = readJson<LockRecord>(lockPath);
  if (record === null) {
    const mtime = fileMtime(lockPath);
    if (mtime === null) {
      return { state: "free" };
    }
    // Exists but unreadable: freshly created files may be mid-first-write.
    return env.now() - mtime < UNREADABLE_GRACE_MS ? { state: "held", record: null } : { state: "stale", record: null };
  }
  return isStale(record, env.now(), env.staleMs ?? STALE_MS) ? { state: "stale", record } : { state: "held", record };
}

/**
 * Try to take the lock. Reaps a stale lock via tombstone-rename (single winner);
 * refuses to grant while a dead holder's winget.exe is still alive.
 */
function acquireLock(
  lockPath: string,
  options: { opId: string; kind: string; title: string },
  env: LockEnvironment = DEFAULT_ENV,
): AcquireResult {
  const record: LockRecord = {
    opId: options.opId,
    kind: options.kind,
    title: options.title,
    startedAt: env.now(),
    heartbeatAt: env.now(),
    wingetPid: null,
  };

  if (createExclusive(lockPath, record) === "created") {
    return { status: "acquired", reaped: null };
  }

  const inspection = inspectLock(lockPath, env);
  if (inspection.state === "free") {
    // Holder vanished between create attempt and inspection; retry once.
    if (createExclusive(lockPath, record) === "created") {
      return { status: "acquired", reaped: null };
    }
    return { status: "busy", holder: readJson<LockRecord>(lockPath) };
  }
  if (inspection.state === "held") {
    return { status: "busy", holder: inspection.record };
  }

  // Stale: the previous holder's winget may still be mutating the system.
  const stale = inspection.record;
  if (stale?.wingetPid != null && env.isWingetProcessAlive(stale.wingetPid)) {
    return { status: "orphan-winget-running", holder: stale };
  }

  // Tombstone-reap: atomic rename means exactly one reaper wins.
  const tombstonePath = `${lockPath}.tomb-${randomUUID()}`;
  try {
    withRetries(() => renameSync(lockPath, tombstonePath));
  } catch {
    // Lost the reap race (or transient hold): report busy; caller may retry.
    return { status: "busy", holder: readJson<LockRecord>(lockPath) };
  }
  const reaped = readJson<LockRecord>(tombstonePath) ?? stale;
  deleteFileQuiet(tombstonePath);

  if (createExclusive(lockPath, record) === "created") {
    return { status: "acquired", reaped };
  }
  return { status: "busy", holder: readJson<LockRecord>(lockPath) };
}

/**
 * Refresh our heartbeat. "fenced" means the lock is gone or owned by someone
 * else — the caller MUST stop mutating (kill winget, mark interrupted) and must
 * not delete the lock.
 */
function heartbeatLock(lockPath: string, opId: string, env: LockEnvironment = DEFAULT_ENV): "ok" | "fenced" {
  const record = readJson<LockRecord>(lockPath);
  if (record === null || record.opId !== opId) {
    return "fenced";
  }
  return rewriteOwnLock(lockPath, { ...record, heartbeatAt: env.now() });
}

/**
 * Rewrite in place rather than rename-replace: a rename here would race a
 * concurrent tombstone-reap and silently recreate a reaped lock. Rewriting the
 * existing file keeps reap (rename away) and heartbeat commutative: if the reap
 * won, our write lands in the tombstone and the fence is detected on the next
 * beat. Readers that catch the torn middle of this write see an unreadable file
 * with a fresh mtime, which inspectLock treats as held.
 */
function rewriteOwnLock(lockPath: string, record: LockRecord): "ok" | "fenced" {
  let fd: number;
  try {
    fd = withRetries(() => openSync(lockPath, "r+"));
  } catch {
    return "fenced";
  }
  try {
    const payload = JSON.stringify(record);
    const written = writeSync(fd, payload, null, "utf-8");
    ftruncateSync(fd, written);
  } finally {
    closeSync(fd);
  }
  return "ok";
}

/** Record the spawned winget PID so reapers can detect a still-running orphan. */
function registerWingetPid(lockPath: string, opId: string, pid: number | null): "ok" | "fenced" {
  const record = readJson<LockRecord>(lockPath);
  if (record === null || record.opId !== opId) {
    return "fenced";
  }
  return rewriteOwnLock(lockPath, { ...record, wingetPid: pid });
}

/** Verify-then-unlink. Returns false when the lock was not ours to release. */
function releaseLock(lockPath: string, opId: string): boolean {
  const record = readJson<LockRecord>(lockPath);
  if (record === null || record.opId !== opId) {
    return false;
  }
  deleteFileQuiet(lockPath);
  return true;
}

export {
  acquireLock,
  DEFAULT_ENV,
  FUTURE_SKEW_MS,
  HEARTBEAT_MS,
  heartbeatLock,
  inspectLock,
  registerWingetPid,
  releaseLock,
  STALE_MS,
  type AcquireResult,
  type LockEnvironment,
  type LockInspection,
  type LockRecord,
};
