import { randomUUID } from "node:crypto";
import { mkdir, open, readFile, stat, unlink, utimes } from "node:fs/promises";
import { dirname } from "node:path";

/** Long enough to outlast any real read-modify-write here; short enough that a crash self-heals */
const LOCK_STALE_MS = 10_000;
// Refresh well before the stale threshold, so a slow holder isn't reclaimed while its event loop keeps running
const LOCK_HEARTBEAT_MS = 1_000;
const LOCK_RETRY_MS = 20;
const LOCK_ATTEMPTS = 250;

/**
 * Run `operation` while holding `<resource>.lock`, across processes. Raycast runs each command, and each AI tool
 * call, in its own process, so without this two of them can read the same History, each add their change, and the
 * second write drops the first.
 *
 * `open(path, "wx")` is the primitive: creating a file exclusively is atomic, so exactly one process wins.
 * Every lock carries an ownership token, so a process only ever removes its own lock, and a heartbeat keeps a live
 * holder younger than the stale threshold, so a lock is reclaimed only when its holder crashed or stalled past it.
 * Node's portable fs has no conditional unlink, so reclaiming keeps a small race; see `removeStaleLock`.
 */
export async function withFileLock<T>(resource: string, operation: () => Promise<T>): Promise<T> {
  const lockPath = `${resource}.lock`;
  const token = `${process.pid}-${randomUUID()}`;
  await mkdir(dirname(lockPath), { recursive: true });

  for (let attempt = 0; attempt < LOCK_ATTEMPTS; attempt++) {
    let acquired = false;
    let created = false;
    try {
      const handle = await open(lockPath, "wx");
      created = true;
      try {
        await handle.writeFile(token, "utf8");
      } finally {
        await handle.close().catch(() => undefined);
      }
      acquired = true;
    } catch (error) {
      // Nothing else can own a path this process just created, so don't leave it behind empty
      if (created) {
        await unlink(lockPath).catch(() => undefined);
        throw error;
      }
      if ((error as NodeJS.ErrnoException)?.code !== "EEXIST") throw error;
    }

    if (acquired) {
      const stopHeartbeat = startLockHeartbeat(lockPath, token);
      try {
        return await operation();
      } finally {
        // Stop first, so a refresh already scheduled can't touch a successor's lock after release
        await stopHeartbeat();
        await removeLockIfOwned(lockPath, token);
      }
    }

    await breakLockIfStale(lockPath);
    await new Promise((resolve) => setTimeout(resolve, LOCK_RETRY_MS));
  }

  throw new Error("Couldn't save: another @ Profile command is still saving. Try again.");
}

function startLockHeartbeat(lockPath: string, token: string) {
  let stopped = false;
  let refresh = Promise.resolve();
  const timer = setInterval(() => {
    refresh = refresh
      .then(async () => {
        if (!stopped) await refreshLockIfOwned(lockPath, token);
      })
      .catch(() => undefined);
  }, LOCK_HEARTBEAT_MS);
  timer.unref();

  return async () => {
    stopped = true;
    clearInterval(timer);
    await refresh;
  };
}

async function refreshLockIfOwned(lockPath: string, token: string) {
  try {
    if ((await readFile(lockPath, "utf8")) === token) {
      const now = new Date();
      await utimes(lockPath, now, now);
    }
  } catch {
    // Removed by a reclaimer; release checks ownership too, so this is harmless
  }
}

async function breakLockIfStale(lockPath: string) {
  const [holder, age] = await Promise.all([
    readFile(lockPath, "utf8").catch(() => undefined),
    stat(lockPath)
      .then((stats) => Date.now() - stats.mtimeMs)
      .catch(() => 0),
  ]);
  if (holder === undefined || age <= LOCK_STALE_MS) return;
  await removeStaleLock(lockPath, holder);
}

/**
 * Reclaim a stale lock (mtime older than LOCK_STALE_MS), re-checking token and age right before the unlink. That
 * narrows, but can't close, one race: a reclaimer that passed both checks can unlink a lock someone else created after
 * them, whether that's another reclaimer that got there first, or a stalled holder that woke, released, and was
 * succeeded. Portable Node fs has no conditional unlink, so closing it needs an OS advisory lock. If it fires, two
 * saves overlap and updates can be lost (not just one); the file stays whole JSON either way.
 */
async function removeStaleLock(lockPath: string, staleToken: string) {
  try {
    const [content, stats] = await Promise.all([readFile(lockPath, "utf8"), stat(lockPath)]);
    if (content !== staleToken || Date.now() - stats.mtimeMs <= LOCK_STALE_MS) return;
    await unlink(lockPath);
  } catch {
    // Already reclaimed or gone
  }
}

async function removeLockIfOwned(lockPath: string, token: string) {
  try {
    if ((await readFile(lockPath, "utf8")) === token) await unlink(lockPath);
  } catch {
    // Already gone
  }
}
