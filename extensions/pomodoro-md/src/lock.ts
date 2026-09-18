import { environment } from "@raycast/api";
import * as fs from "fs";
import * as path from "path";

// macOS open(2) flag: take an exclusive flock() on the file being opened.
// Node does not export it in fs.constants; the value is from <sys/fcntl.h>.
// This extension is macOS-only (package.json "platforms"), so relying on it
// is fine. Verified on the Node runtime bundled with Raycast (v22.22.2).
const O_EXLOCK = 0x20;

const LOCK_FILE = "session.lock";
const ACQUIRE_TIMEOUT_MS = 2000;
const RETRY_INTERVAL_MS = 25;

/**
 * Proof that the session lock is held. Functions that mutate shared state
 * (the stored timer, the session log, the daily note) require it as an
 * argument, so they cannot be called from outside `withSessionLock`.
 */
export interface SessionLock {
  readonly held: true;
}

/** Guard for functions that must only run inside `withSessionLock`. */
export function assertHeld(lock: SessionLock): void {
  if (!lock || lock.held !== true) {
    throw new Error("session lock is required");
  }
}

export type LockResult<T> =
  | { acquired: true; value: T }
  | { acquired: false; reason: "busy" }
  | { acquired: false; reason: "error"; error: unknown };

/**
 * Run `fn` while holding the extension-wide session lock.
 *
 * The lock is a kernel flock (O_EXLOCK) on a file in the extension's support
 * directory. Raycast runs every command as a worker of one Node process, and
 * flock is per open file description, so workers exclude each other. The
 * kernel releases the lock when the descriptor closes — including when a
 * worker is torn down — so there is no stale-lock state to recover from and
 * nothing to unlink.
 *
 * `acquired: false` means `fn` did not run and no shared state was touched:
 * "busy" when another holder kept the lock for the whole wait, "error" for
 * anything else (permissions, missing support directory, ...).
 */
export async function withSessionLock<T>(
  fn: (lock: SessionLock) => Promise<T>,
): Promise<LockResult<T>> {
  let fd: number;
  try {
    fd = await acquire();
  } catch (error) {
    return isWouldBlock(error)
      ? { acquired: false, reason: "busy" }
      : { acquired: false, reason: "error", error };
  }
  try {
    const value = await fn({ held: true });
    return { acquired: true, value };
  } finally {
    try {
      fs.closeSync(fd);
    } catch {
      // Already closed; the kernel has released the lock either way.
    }
  }
}

async function acquire(): Promise<number> {
  const file = lockPath();
  const flags =
    fs.constants.O_RDWR |
    fs.constants.O_CREAT |
    O_EXLOCK |
    fs.constants.O_NONBLOCK;
  const deadline = monotonicNow() + ACQUIRE_TIMEOUT_MS;
  for (;;) {
    try {
      return fs.openSync(file, flags);
    } catch (error) {
      if (!isWouldBlock(error) || monotonicNow() >= deadline) throw error;
      await sleep(RETRY_INTERVAL_MS);
    }
  }
}

function lockPath(): string {
  const dir = environment.supportPath;
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, LOCK_FILE);
}

function isWouldBlock(error: unknown): boolean {
  const code = (error as NodeJS.ErrnoException | undefined)?.code;
  return code === "EAGAIN" || code === "EWOULDBLOCK";
}

function monotonicNow(): number {
  return Number(process.hrtime.bigint() / 1_000_000n);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
