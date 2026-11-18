import { LocalStorage } from "@raycast/api";
import { randomUUID } from "node:crypto";
import { sleep } from "../utils/common";

/** The lock stored under its key while a command holds it. */
interface StoredLock {
  id: string;
  /** Unix milliseconds. */
  lockedAt: number;
  /** Unix milliseconds: after this, the lock counts as free, e.g. when its command quit while holding it. */
  expiresAt: number;
}

/** No command holds a lock longer than this. The work done under one is a storage read and write. */
const LOCK_TTL = 10_000;
/** How long a new lock waits before reading it back, so a lock written at the same time shows. */
const SETTLE_DELAY = 50;
/** How often a waiting command checks whether the lock is free. Jitter keeps waiting commands from colliding. */
const POLL_DELAY = 100;

/** The lock wasn't free within the time given to `withStorageLock`. */
export class LockTimeoutError extends Error {
  constructor() {
    super("Another command is saving the same data. Try again in a moment.");
    this.name = "LockTimeoutError";
  }
}

// Locks of this process run one at a time per key, so they never race each other.
const queues = new Map<string, Promise<unknown>>();

/**
 * Runs `fn` while holding the lock stored under `key`, so a read-modify-write of shared storage in one command,
 * the menu bar or the AI never overwrites what another saved at the same time. Waits up to `wait` milliseconds for
 * the lock, then throws `LockTimeoutError`.
 */
export function withStorageLock<T>(key: string, fn: () => Promise<T>, { wait = 15_000 } = {}): Promise<T> {
  const next = (queues.get(key) ?? Promise.resolve()).then(async () => {
    const id = await acquire(key, Date.now() + wait);
    try {
      return await fn();
    } finally {
      await release(key, id);
    }
  });
  queues.set(
    key,
    next.catch(() => undefined),
  );
  return next;
}

async function readLock(key: string): Promise<StoredLock | undefined> {
  const value = await LocalStorage.getItem<string>(key);
  if (typeof value !== "string") return undefined;
  try {
    const lock: unknown = JSON.parse(value);
    if (
      typeof lock === "object" &&
      lock !== null &&
      typeof (lock as StoredLock).id === "string" &&
      typeof (lock as StoredLock).lockedAt === "number" &&
      typeof (lock as StoredLock).expiresAt === "number"
    ) {
      return lock as StoredLock;
    }
  } catch {
    // Unreadable: treated as free.
  }
  return undefined;
}

/** Whether `lock` is held: not expired, and not taken "in the future" (e.g. before the clock was set back). */
function isHeld(lock: StoredLock | undefined, now: number): lock is StoredLock {
  return !!lock && lock.expiresAt > now && lock.lockedAt <= now;
}

/**
 * Takes the lock once it's free and returns its id. The lock is written and then read back: another command that
 * took it at the same time may have overwritten it, and then this one waits again.
 */
async function acquire(key: string, deadline: number): Promise<string> {
  const id = randomUUID();

  for (;;) {
    const now = Date.now();
    if (!isHeld(await readLock(key), now)) {
      await LocalStorage.setItem(key, JSON.stringify({ id, lockedAt: now, expiresAt: now + LOCK_TTL }));
      await sleep(SETTLE_DELAY);
      if ((await readLock(key))?.id === id) return id;
    }

    if (Date.now() >= deadline) throw new LockTimeoutError();
    await sleep(POLL_DELAY * (0.5 + Math.random()));
  }
}

/** Frees the lock, unless it expired and another command took it meanwhile. */
async function release(key: string, id: string) {
  if ((await readLock(key))?.id === id) await LocalStorage.removeItem(key);
}
