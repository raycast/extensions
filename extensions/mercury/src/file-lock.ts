import { randomUUID } from "node:crypto";
import { mkdir, open, readFile, stat, unlink, utimes } from "node:fs/promises";
import { dirname, join } from "node:path";
import { environment } from "@raycast/api";

// Ported from the Context7 extension's `src/lib/atomic-file.ts`, where each guard below was added
// for a review finding. Don't simplify one away without reading why it's there.

/** The lock resource for one login's saved balances. */
export const balancesLock = (loginId: string) => join(environment.supportPath, "locks", `balances-${loginId}`);

/** Long enough to outlast any real read-modify-write here; short enough that a crash self-heals. */
const LOCK_STALE_MS = 10_000;
// Critical sections are only local reads and writes. Refresh well before the stale threshold so
// a live holder is not mistaken for a crashed one while the process is otherwise healthy.
const LOCK_HEARTBEAT_MS = 1_000;
const LOCK_RETRY_MS = 20;
const LOCK_ATTEMPTS = 100;

/**
 * Serializes a whole read-modify-write across command processes (the menu bar and an open list),
 * which the in-process save queue cannot do.
 *
 * `open(path, "wx")` is the primitive that makes this work: creating a file exclusively is
 * atomic at the filesystem level, so exactly one process wins the race and the rest wait.
 * Compare-and-swap is NOT a substitute — it leaves a window between the verification read and
 * the write that a lockstep interleave lands in every time (measured: 1 of 8 concurrent writes
 * survived without a lock, 8 of 8 with one).
 *
 * Every lock carries an ownership token. Normal release checks it before deleting, and a
 * heartbeat keeps a live holder younger than the stale threshold. Node's portable filesystem
 * API has no conditional-unlink operation, so stale reclamation still has a very small
 * compare/unlink race between two reclaimers of an already-dead holder; avoiding a live holder
 * ever entering that path is therefore essential.
 */
export async function withFileLock<T>(resource: string, operation: () => Promise<T>): Promise<T> {
  // The lock is `<resource>.lock`. `resource` is only a name: it guards a LocalStorage key,
  // which has no atomic primitive of its own.
  const lockPath = `${resource}.lock`;
  const token = `${process.pid}-${randomUUID()}`;
  await mkdir(dirname(resource), { recursive: true });

  for (let attempt = 0; attempt < LOCK_ATTEMPTS; attempt += 1) {
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
      // `open("wx")` succeeded but writing the ownership token failed. Nothing else can own
      // this just-created path yet, so remove it instead of leaving a fresh empty lock behind
      // until stale-lock recovery runs.
      if (created) {
        await unlink(lockPath).catch(() => undefined);
        throw error;
      }

      if ((error as NodeJS.ErrnoException)?.code !== "EEXIST") {
        throw error;
      }
    }

    if (acquired) {
      const stopHeartbeat = startLockHeartbeat(lockPath, token);

      try {
        return await operation();
      } finally {
        // Do not let an already-scheduled refresh touch a successor after release. This also
        // clears the timer when `operation` throws.
        await stopHeartbeat();
        // A matching token makes ordinary release a no-op after a successor has replaced the
        // lease. See the function-level note for the residual stale-reclaimer TOCTOU window.
        await removeLockIfOwned(lockPath, token);
      }
    }

    await breakLockIfStale(lockPath);
    await new Promise((resolve) => setTimeout(resolve, LOCK_RETRY_MS));
  }

  throw new Error("Couldn't save balances: another Mercury command is still writing. Try again.");
}

/** Keeps an active lease fresh and waits for any in-flight refresh before releasing it. */
function startLockHeartbeat(lockPath: string, token: string) {
  let stopped = false;
  let refresh = Promise.resolve();

  const tick = () => {
    refresh = refresh
      .then(async () => {
        if (!stopped) {
          await refreshLockIfOwned(lockPath, token);
        }
      })
      .catch(() => undefined);
  };

  const timer = setInterval(tick, LOCK_HEARTBEAT_MS);
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
    // A crash/reclaimer may have removed the lease. The owner check makes this a harmless
    // no-op, and the caller will avoid deleting a successor during its final cleanup.
  }
}

/** Reclaims a lock whose holder died. The token avoids ordinary successor deletion, but cannot
 * make the final pathname unlink conditional on that token with portable Node filesystem APIs. */
async function breakLockIfStale(lockPath: string) {
  const [holder, age] = await Promise.all([
    readFile(lockPath, "utf8").catch(() => undefined),
    stat(lockPath)
      .then((stats) => Date.now() - stats.mtimeMs)
      .catch(() => 0),
  ]);

  if (holder === undefined || age <= LOCK_STALE_MS) {
    return;
  }

  await removeStaleLock(lockPath, holder);
}

/**
 * Reclaims a dead holder's lock, re-checking BOTH the token and the age immediately before
 * unlinking.
 *
 * The token alone is not enough. Two processes can judge the same stale lock, the first
 * reclaims it, a third acquires the freed path — and the second's delete then removes that
 * *successor's* lock, putting two writers in the critical section. Re-reading the token
 * narrows that window but does not close it.
 *
 * Age closes the reachable part: a successor's lock is by definition brand new, so deleting
 * one would require this process to stall for longer than the stale threshold between the
 * stat and the unlink below — at which point it is itself the hung process. Node's portable
 * filesystem API has no conditional unlink, so this is as tight as it gets without a
 * platform-specific advisory lock; `rename`-to-claim and `link`-based schemes move the same
 * window rather than removing it.
 */
async function removeStaleLock(lockPath: string, staleToken: string) {
  try {
    const [content, stats] = await Promise.all([readFile(lockPath, "utf8"), stat(lockPath)]);

    if (content !== staleToken || Date.now() - stats.mtimeMs <= LOCK_STALE_MS) {
      return;
    }

    await unlink(lockPath);
  } catch {
    // Already reclaimed by someone else, or gone — nothing to do either way.
  }
}

async function removeLockIfOwned(lockPath: string, token: string) {
  try {
    if ((await readFile(lockPath, "utf8")) === token) {
      await unlink(lockPath);
    }
  } catch {
    // Already gone, or unreadable — either way there is nothing of ours to remove.
  }
}
