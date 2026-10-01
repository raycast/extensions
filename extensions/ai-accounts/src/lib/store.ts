import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { threadId } from "node:worker_threads";
import {
  Account,
  emptySnapshot,
  emptySuggestionState,
  OperationRecord,
  Provider,
  ProviderFetch,
  ProviderState,
  Snapshot,
  SuggestionState,
} from "./model";
import { sanitize } from "./exec";

// All persistent extension state lives as small JSON files in one directory
// (Raycast's environment.supportPath at runtime, a temp dir in tests).
// Concurrency model (cross-command, cross-worker):
//   provider-<p>.lock  held for the whole backend invocation (refresh OR switch) of provider p
//   state.lock         short lock around read-merge-write of snapshot/operations/suggestion state
// Lock order is always provider lock -> state lock. Readers never lock.

const SNAPSHOT = "snapshot.json";
const OPERATIONS = "operations.json";
const SUGGESTION_STATE = "suggestion-state.json";

export function atomicWriteFile(file: string, data: string | Buffer, mode = 0o600): void {
  const dir = path.dirname(file);
  const tmp = path.join(dir, `.${path.basename(file)}.${process.pid}.${crypto.randomBytes(6).toString("hex")}.tmp`);
  const fd = fs.openSync(tmp, "wx", mode);
  try {
    try {
      fs.writeSync(fd, typeof data === "string" ? Buffer.from(data, "utf8") : data);
      fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }
    fs.renameSync(tmp, file);
  } catch (error) {
    // Never leave a temp copy behind (it may hold credential bytes).
    try {
      fs.unlinkSync(tmp);
    } catch {
      // ignore
    }
    throw error;
  }
}

function readJson<T>(file: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as T;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Locks
//
// A lock is a heartbeat lease. The live holder rewrites heartbeatAt every HEARTBEAT_MS until release, so it
// keeps the lock through every phase of its work, whether or not a child process is running at that moment.
// A Raycast worker that is terminated (menu closed, Esc, background time limit) stops heartbeating, and its
// lock can be reclaimed once the heartbeat is LOCK_LEASE_MS old, unless a child it recorded is still running
// (a switch child may still be changing credentials). Raycast command workers share one process, so the
// holder's own pid says nothing about whether the holder is alive.
//
// Every change to an existing lock file (reclaim, heartbeat, child pid, release) happens inside a short
// exclusive section guarded by an O_EXCL "<lock>.reclaim" marker, re-reading the lock first: two reclaimers
// cannot both remove the same stale lock, and a holder never rewrites or removes a lock that is not its own.

/** How often a live holder refreshes its lease. */
export const HEARTBEAT_MS = 2_000;
/** A lock whose heartbeat is older than this (and whose recorded child is gone) is abandoned. */
export const LOCK_LEASE_MS = 10_000;
/** A dead holder's still-running child keeps the lock at most this long (guards against pid reuse). */
const CHILD_GRACE_MS = 15 * 60_000;
/**
 * A holder that finished while a child it recorded is still running (a cswap query past its UI deadline, which is
 * never signalled) leaves the lock to that child for at most this long, so no second run starts over it.
 */
const DETACHED_CHILD_MS = 120_000;
/** An unreadable lock (creator died between create and write) is abandoned after this. */
const UNREADABLE_STALE_MS = 5_000;
/** The exclusive section is held for microseconds; a marker this old was left by a terminated worker. */
const GUARD_STALE_MS = 5_000;

const OWNER_TAG = `${process.pid}:${threadId}`;

interface LockBody {
  token: string;
  purpose: string;
  /** Diagnostic only: process and thread that took the lock. */
  ownerTag?: string;
  createdAt: number;
  /** Refreshed by the live holder every HEARTBEAT_MS. */
  heartbeatAt?: number;
  childPid?: number;
  /** Set when the holder released while its recorded child was still running: the lock now belongs to that child. */
  detachedAt?: number;
}

export interface LockHandle {
  file: string;
  token: string;
  /** Record the pid of a child process doing the locked work (it keeps the lock if this worker dies). */
  setChildPid(pid: number | undefined): void;
  release(): void;
}

/** A recorded child pid worth probing (pid 0 or a negative pid would address a process group, always "alive"). */
function validChild(pid: unknown): pid is number {
  return typeof pid === "number" && Number.isInteger(pid) && pid > 0;
}

/** Test seam: returns the ps state letters for a pid ("" when unknown). */
export let readProcessState = (pid: number): string => {
  try {
    return execFileSync("/bin/ps", ["-o", "stat=", "-p", String(pid)], { encoding: "utf8", timeout: 2_000 }).trim();
  } catch {
    return "";
  }
};

export function setProcessStateReader(reader: (pid: number) => string): void {
  readProcessState = reader;
}

/**
 * A child spawned by a Raycast worker that was terminated is never reaped, so it lingers as a zombie that
 * `kill(pid, 0)` still reports as alive. Zombies are dead for locking purposes.
 */
function pidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EPERM") return false;
  }
  return !readProcessState(pid).startsWith("Z");
}

function lockBody(value: unknown): LockBody | null {
  if (!value || typeof value !== "object") return null;
  return typeof (value as LockBody).token === "string" ? (value as LockBody) : null;
}

function removeQuietly(file: string): void {
  try {
    fs.unlinkSync(file);
  } catch {
    // already gone
  }
}

function inode(file: string): number | null {
  try {
    return fs.statSync(file).ino;
  } catch {
    return null;
  }
}

function sleepSync(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/** Whether a lock may be reclaimed: its holder stopped heartbeating and no child it recorded is still running. */
function isStale(body: LockBody | null, file: string, leaseMs: number): boolean {
  const now = Date.now();
  let mtimeMs: number;
  try {
    mtimeMs = fs.statSync(file).mtimeMs;
  } catch {
    return false; // gone: nothing to reclaim, the caller retries the create
  }
  if (!body) return now - mtimeMs > UNREADABLE_STALE_MS;
  if (typeof body.detachedAt === "number") {
    // Released by its holder; held only for the detached child, until it exits.
    return !(validChild(body.childPid) && now - body.detachedAt <= DETACHED_CHILD_MS && pidAlive(body.childPid));
  }
  const beat =
    typeof body.heartbeatAt === "number"
      ? body.heartbeatAt
      : typeof body.createdAt === "number"
        ? body.createdAt
        : mtimeMs;
  const silentFor = now - beat;
  if (silentFor <= leaseMs) return false;
  const child = body.childPid;
  if (validChild(child) && silentFor <= CHILD_GRACE_MS && pidAlive(child)) return false;
  return true;
}

interface GuardBody {
  nonce: string;
  at: number;
}

/**
 * Remove a guard marker left by a terminated worker. The marker is moved aside first and removed only if it is
 * the same file that was judged stale; a newer marker moved by mistake is linked back (never overwriting).
 */
function breakStaleGuard(marker: string): boolean {
  let judgedIno: number;
  let at: number;
  try {
    const st = fs.statSync(marker);
    judgedIno = st.ino;
    const body = readJson<GuardBody>(marker);
    at = typeof body?.at === "number" ? body.at : st.mtimeMs;
  } catch {
    return true; // gone: retry the create
  }
  if (Date.now() - at <= GUARD_STALE_MS) return false;
  const aside = `${marker}.${crypto.randomBytes(4).toString("hex")}`;
  try {
    fs.renameSync(marker, aside);
  } catch {
    return true; // someone else moved it
  }
  try {
    if (inode(aside) === judgedIno) return true;
    try {
      fs.linkSync(aside, marker);
    } catch {
      // a newer marker exists already
    }
    return false;
  } finally {
    removeQuietly(aside);
  }
}

/** Try once to enter the exclusive section of `file`; returns the nonce to leave it with, or null when busy. */
function enterGuard(file: string): string | null {
  const marker = `${file}.reclaim`;
  const nonce = crypto.randomUUID();
  for (let attempt = 0; attempt < 2; attempt++) {
    let fd: number;
    try {
      fd = fs.openSync(marker, "wx", 0o600);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      if (attempt > 0 || !breakStaleGuard(marker)) return null;
      continue;
    }
    try {
      const body: GuardBody = { nonce, at: Date.now() };
      fs.writeSync(fd, JSON.stringify(body));
    } catch (error) {
      removeQuietly(marker);
      throw error;
    } finally {
      fs.closeSync(fd);
    }
    return nonce;
  }
  return null;
}

function leaveGuard(file: string, nonce: string): void {
  const marker = `${file}.reclaim`;
  if (readJson<GuardBody>(marker)?.nonce === nonce) removeQuietly(marker);
}

/**
 * Run fn inside the exclusive section of `file`, waiting synchronously up to waitMs for it (it is only ever
 * held for a few file operations). Returns null when the section stayed busy.
 */
function withGuard<T>(file: string, waitMs: number, fn: () => T): { value: T } | null {
  const deadline = Date.now() + waitMs;
  for (;;) {
    const nonce = enterGuard(file);
    if (nonce !== null) {
      try {
        return { value: fn() };
      } finally {
        leaveGuard(file, nonce);
      }
    }
    if (Date.now() >= deadline) return null;
    sleepSync(2);
  }
}

/** Remove a lock judged stale, only if it is still the same lock and still stale (re-checked in the guard). */
function reclaimStale(file: string, judged: LockBody | null, leaseMs: number): boolean {
  const judgedIno = judged ? null : inode(file);
  const done = withGuard(file, 0, () => {
    const current = lockBody(readJson(file));
    const same = judged ? current?.token === judged.token : current === null && inode(file) === judgedIno;
    if (!same || !isStale(current, file, leaseMs)) return false;
    try {
      fs.unlinkSync(file);
      return true;
    } catch (error) {
      return (error as NodeJS.ErrnoException).code === "ENOENT"; // an undeletable lock is not reclaimed
    }
  });
  return done?.value === true;
}

function tryCreateLock(file: string, token: string, purpose: string): LockBody | null {
  let fd: number;
  try {
    fd = fs.openSync(file, "wx", 0o600);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") return null;
    throw error;
  }
  const now = Date.now();
  const body: LockBody = { token, purpose, ownerTag: OWNER_TAG, createdAt: now, heartbeatAt: now };
  try {
    fs.writeSync(fd, JSON.stringify(body));
  } catch (error) {
    removeQuietly(file);
    throw error;
  } finally {
    fs.closeSync(fd);
  }
  return body;
}

export interface LockOptions {
  purpose: string;
  /** How long to wait for a busy lock before giving up (0 = try once). */
  waitMs?: number;
  /** Heartbeat age after which another holder's lock counts as abandoned (default LOCK_LEASE_MS). */
  staleMs?: number;
  /** How often this holder refreshes its heartbeat (default HEARTBEAT_MS). Tests shorten it. */
  heartbeatMs?: number;
}

export async function acquireLock(dir: string, name: string, opts: LockOptions): Promise<LockHandle | null> {
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  const file = path.join(dir, `${name}.lock`);
  const token = crypto.randomUUID();
  const deadline = Date.now() + (opts.waitMs ?? 0);
  const leaseMs = opts.staleMs ?? LOCK_LEASE_MS;
  for (;;) {
    const body = tryCreateLock(file, token, opts.purpose);
    if (body) return makeHandle(file, body, opts.heartbeatMs ?? HEARTBEAT_MS);
    const judged = lockBody(readJson(file));
    if (isStale(judged, file, leaseMs) && reclaimStale(file, judged, leaseMs)) continue;
    if (!fs.existsSync(file)) continue; // released meanwhile: retry the create at once
    if (Date.now() >= deadline) return null;
    await new Promise((r) => setTimeout(r, 150));
  }
}

function makeHandle(file: string, body: LockBody, heartbeatMs: number): LockHandle {
  let released = false;
  let lost = false;
  const timer = setInterval(() => {
    try {
      rewrite(() => {
        body.heartbeatAt = Date.now();
      }, 50);
    } catch {
      // a missed beat is retried on the next tick
    }
  }, heartbeatMs);
  timer.unref();
  /** Rewrite our lock body, only while the file still carries our token. */
  function rewrite(change: () => void, waitMs: number): void {
    if (released || lost) return;
    const done = withGuard(file, waitMs, () => {
      if (lockBody(readJson(file))?.token !== body.token) return false;
      change();
      atomicWriteFile(file, JSON.stringify(body));
      return true;
    });
    if (done?.value === false) {
      // Reclaimed by someone else (this worker stalled past the lease): never touch that lock again.
      lost = true;
      clearInterval(timer);
    }
  }
  return {
    file,
    token: body.token,
    setChildPid(pid) {
      if (pid === undefined) return;
      try {
        rewrite(() => {
          body.childPid = pid;
          body.heartbeatAt = Date.now();
        }, 250);
      } catch {
        // bookkeeping only; the heartbeat still protects the lock while this worker lives
      }
    },
    release() {
      if (released) return;
      released = true;
      clearInterval(timer);
      if (lost) return;
      try {
        withGuard(file, 250, () => {
          // Compare and delete: a missing, unreadable or foreign lock is never removed.
          if (lockBody(readJson(file))?.token !== body.token) return;
          if (validChild(body.childPid) && pidAlive(body.childPid)) {
            // A child doing the locked work outlived its caller's deadline: hand the lock to it (see isStale).
            body.detachedAt = Date.now();
            atomicWriteFile(file, JSON.stringify(body));
          } else {
            removeQuietly(file);
          }
        });
      } catch {
        // an unreleased lock frees itself once its heartbeat is LOCK_LEASE_MS old
      }
    },
  };
}

/** Whether a refresh or switch currently holds the provider lock (read-only; the list uses it to stop watching). */
export function providerLockHeld(dir: string, provider: Provider): boolean {
  const file = path.join(dir, `provider-${provider}.lock`);
  if (!fs.existsSync(file)) return false;
  return !isStale(lockBody(readJson(file)), file, LOCK_LEASE_MS);
}

export async function withStateLock<T>(dir: string, fn: () => T): Promise<T> {
  // Held only around synchronous read-merge-write, so a short lease is safe and a dead holder frees quickly.
  const lock = await acquireLock(dir, "state", { purpose: "state", waitMs: 8_000, staleMs: 5_000 });
  if (!lock) throw new Error("Could not lock extension state (busy)");
  try {
    return fn();
  } finally {
    lock.release();
  }
}

// ---------------------------------------------------------------------------
// Snapshot

export function readSnapshot(dir: string): Snapshot {
  const data = readJson<Snapshot>(path.join(dir, SNAPSHOT));
  if (!data || data.version !== 2 || !data.providers?.claude || !data.providers?.codex) return emptySnapshot();
  return data;
}

function writeSnapshot(dir: string, snap: Snapshot): void {
  atomicWriteFile(path.join(dir, SNAPSHOT), JSON.stringify(snap));
}

/**
 * Account-level merge rules for a successful fetch:
 *  - accounts absent from the new authoritative inventory are dropped (never resurrected);
 *  - an account that now reports a non-ok status with no usable numbers keeps its previous numbers,
 *    marked lastGood (display-only, never actionable); its status stays the new non-ok status.
 */
export function mergeAccounts(previous: Account[], next: Account[]): Account[] {
  const prevByKey = new Map(previous.map((a) => [a.key, a]));
  return next.map((account) => {
    if (account.status === "ok") return account;
    const hasNumbers = account.windows.some((w) => w.usedPct !== null);
    const prev = prevByKey.get(account.key);
    if (hasNumbers || !prev) return account;
    const prevHasNumbers = prev.windows.some((w) => w.usedPct !== null);
    if (!prevHasNumbers) return account;
    return { ...account, windows: prev.windows, lastGood: true };
  });
}

/**
 * ProviderState as this module persists it. lastFailedAt is when the last failed attempt was recorded, i.e.
 * after the fetch settled (a fetch can run for its whole 45 s timeout); the retry backoff is measured from it.
 * lastAttemptAt keeps its meaning (when the attempt started) for the list's operation watcher.
 */
export type StoredProviderState = ProviderState & { lastFailedAt?: string | null };

export interface FetchHooks {
  /** Pid of a backend child doing the fetch; it keeps the provider lock while it runs (even past a UI deadline). */
  onSpawn?: (pid: number | undefined) => void;
}

export type RefreshOutcome =
  | { kind: "committed"; revision: number }
  | { kind: "failed"; error: string }
  | { kind: "busy" } // another refresh/switch holds the provider lock; caller should just re-read
  | { kind: "superseded" }; // a switch happened while fetching; result discarded

/**
 * Run one provider fetch under the provider lock and commit it with serialized merge.
 * Never overwrites a newer identity generation (a switch that completed mid-fetch).
 */
export async function refreshProvider(
  dir: string,
  provider: Provider,
  fetcher: (hooks: FetchHooks) => Promise<ProviderFetch>,
  opts: { waitMs?: number } = {},
): Promise<RefreshOutcome> {
  const lock = await acquireLock(dir, `provider-${provider}`, { purpose: "refresh", waitMs: opts.waitMs ?? 0 });
  if (!lock) return { kind: "busy" };
  try {
    const generation = readSnapshot(dir).providers[provider].identityGeneration;
    const attemptAt = new Date().toISOString();
    let fetched: ProviderFetch;
    try {
      fetched = await fetcher({ onSpawn: (pid) => lock.setChildPid(pid) });
    } catch (error) {
      const message = sanitize(error instanceof Error ? error.message : error);
      await withStateLock(dir, () => {
        const snap = readSnapshot(dir);
        const state: StoredProviderState = snap.providers[provider];
        state.lastAttemptAt = attemptAt;
        state.lastFailedAt = new Date().toISOString();
        state.lastError = message || "Refresh failed";
        writeSnapshot(dir, snap);
      });
      return { kind: "failed", error: message };
    }
    return await withStateLock(dir, (): RefreshOutcome => {
      const snap = readSnapshot(dir);
      const state: StoredProviderState = snap.providers[provider];
      if (state.identityGeneration !== generation) return { kind: "superseded" };
      state.accounts = mergeAccounts(state.accounts, fetched.accounts);
      state.source = fetched.source;
      state.notices = fetched.notices.map((n) => sanitize(n));
      state.committedAt = new Date().toISOString();
      state.lastAttemptAt = attemptAt;
      state.lastFailedAt = null;
      state.lastError = null;
      state.revision += 1;
      writeSnapshot(dir, snap);
      return { kind: "committed", revision: state.revision };
    });
  } finally {
    lock.release();
  }
}

/** After a confirmed switch: bump the identity generation and mark the new active account. */
export async function commitSwitch(dir: string, provider: Provider, activeKey: string): Promise<void> {
  await withStateLock(dir, () => {
    const snap = readSnapshot(dir);
    const state = snap.providers[provider];
    state.identityGeneration += 1;
    state.accounts = state.accounts.map((a) => ({ ...a, active: a.key === activeKey }));
    state.revision += 1;
    writeSnapshot(dir, snap);
  });
}

function markIdentityUnknown(state: ProviderState): void {
  state.identityGeneration += 1;
  state.accounts = state.accounts.map((a) => ({ ...a, active: "unknown" as const }));
  state.revision += 1;
}

/** Bump the generation without asserting a new active account (switch outcome unknown). */
export async function invalidateIdentity(dir: string, provider: Provider): Promise<void> {
  await withStateLock(dir, () => {
    const snap = readSnapshot(dir);
    markIdentityUnknown(snap.providers[provider]);
    writeSnapshot(dir, snap);
  });
}

// ---------------------------------------------------------------------------
// Switch operation records (request id -> running -> succeeded | failed | unknown)

/** OperationRecord as a switch persists it, with the bookkeeping orphan reconciliation needs. */
export type StoredOperationRecord = OperationRecord & {
  /** Token of the provider lock the switch held while this record was running. */
  lockToken?: string;
  /** The provider's identityGeneration when the switch started. */
  generation?: number;
};

const MAX_OPERATIONS = 25;

export function readOperations(dir: string): OperationRecord[] {
  const data = readJson<{ records: OperationRecord[] }>(path.join(dir, OPERATIONS));
  return Array.isArray(data?.records) ? data!.records : [];
}

function writeOperations(dir: string, records: OperationRecord[]): void {
  atomicWriteFile(path.join(dir, OPERATIONS), JSON.stringify({ records: records.slice(0, MAX_OPERATIONS) }));
}

export async function upsertOperation(dir: string, record: StoredOperationRecord): Promise<void> {
  await withStateLock(dir, () => {
    const records = readOperations(dir).filter((r) => r.requestId !== record.requestId);
    records.unshift(record);
    writeOperations(dir, records);
  });
}

/** Add a record unless one with the same request id exists (a request id is handled at most once). */
export async function insertOperation(dir: string, record: StoredOperationRecord): Promise<boolean> {
  return withStateLock(dir, () => {
    const records = readOperations(dir);
    if (records.some((r) => r.requestId === record.requestId)) return false;
    writeOperations(dir, [record, ...records]);
    return true;
  });
}

function isoMs(iso: unknown): number | null {
  if (typeof iso !== "string") return null;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
}

/**
 * Settle switch records of `provider` left "running" by a worker that died, in one state-lock section. A record
 * is changed only while it is still running and unfinished, and only when the provider lock its switch held is
 * no longer live (released, or its heartbeat expired). Callers hold the provider lock, so a record without a
 * lock token (written before tokens were recorded) is orphaned too. In the same section, the active marker is
 * invalidated when nothing has re-observed the provider since that switch began and no commit or invalidation
 * has landed since (the generation is unchanged).
 */
export async function reconcileRunningOperations(
  dir: string,
  provider: Provider,
  finishedAt: string,
  message: string,
): Promise<{ reconciled: number; invalidated: boolean }> {
  const lockFile = path.join(dir, `provider-${provider}.lock`);
  return withStateLock(dir, () => {
    const holder = lockBody(readJson(lockFile));
    const liveToken = holder && !isStale(holder, lockFile, LOCK_LEASE_MS) ? holder.token : null;
    const snap = readSnapshot(dir);
    const state = snap.providers[provider];
    const committed = isoMs(state.committedAt);
    let reconciled = 0;
    let invalidate = false;
    const records = (readOperations(dir) as StoredOperationRecord[]).map((r): StoredOperationRecord => {
      if (r.provider !== provider || r.state !== "running" || r.finishedAt !== null) return r;
      if (typeof r.lockToken === "string" && r.lockToken === liveToken) return r; // its switch still holds the lock
      reconciled += 1;
      const started = isoMs(r.startedAt);
      const unobserved = committed === null || started === null || committed < started;
      const settled = typeof r.generation === "number" && r.generation !== state.identityGeneration;
      if (unobserved && !settled) invalidate = true;
      return { ...r, state: "unknown", finishedAt, message };
    });
    if (reconciled === 0) return { reconciled, invalidated: false };
    writeOperations(dir, records);
    if (invalidate) {
      markIdentityUnknown(state);
      writeSnapshot(dir, snap);
    }
    return { reconciled, invalidated: invalidate };
  });
}

/** The most recent operation for a provider whose outcome is still running or unknown. */
export function pendingOperation(dir: string, provider: Provider): OperationRecord | null {
  return (
    readOperations(dir).find((r) => r.provider === provider && (r.state === "running" || r.state === "unknown")) ?? null
  );
}

// ---------------------------------------------------------------------------
// Suggestion hysteresis state

export function readSuggestionState(dir: string): SuggestionState {
  const data = readJson<SuggestionState>(path.join(dir, SUGGESTION_STATE));
  if (!data || !Array.isArray(data.active) || typeof data.clearedAt !== "object") return emptySuggestionState();
  return data;
}

export async function writeSuggestionState(dir: string, state: SuggestionState): Promise<void> {
  const current = readSuggestionState(dir);
  if (JSON.stringify(current) === JSON.stringify(state)) return;
  await withStateLock(dir, () => atomicWriteFile(path.join(dir, SUGGESTION_STATE), JSON.stringify(state)));
}
