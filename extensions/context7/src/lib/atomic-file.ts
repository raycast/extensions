import { randomUUID } from "node:crypto";
import { mkdir, open, readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

/**
 * Raycast runs each command in its own process, so the in-process write queues do NOT
 * serialize across commands. Two commands writing the same file concurrently could otherwise
 * interleave and leave truncated JSON on disk — which parses as an error, is read as an empty
 * list, and gets permanently overwritten by the next mutation.
 *
 * Writing to a unique temp file and renaming closes that hole: `rename` is atomic within a
 * filesystem, so a reader sees either the whole previous file or the whole new one.
 *
 * This makes writes atomic, not transactional — for that, see `withFileLock`.
 */
export async function writeFileAtomic(filePath: string, contents: string) {
  const directory = dirname(filePath);
  await mkdir(directory, { recursive: true });

  // Unique per call: two concurrent writers must not share a temp path.
  const tempPath = join(directory, `.${process.pid}-${Math.random().toString(36).slice(2)}.tmp`);

  try {
    await writeFile(tempPath, contents, "utf8");
    await rename(tempPath, filePath);
  } catch (error) {
    await unlink(tempPath).catch(() => undefined);
    throw error;
  }
}

/** Long enough to outlast any real read-modify-write here; short enough that a crash self-heals. */
const LOCK_STALE_MS = 10_000;
const LOCK_RETRY_MS = 20;
const LOCK_ATTEMPTS = 100;

/**
 * Serializes a whole read-modify-write across command PROCESSES, which the in-process write
 * queue cannot do.
 *
 * `open(path, "wx")` is the primitive that makes this work: creating a file exclusively is
 * atomic at the filesystem level, so exactly one process wins the race and the rest wait.
 * Compare-and-swap is NOT a substitute — it leaves a window between the verification read and
 * the write that a lockstep interleave lands in every time (measured: 1 of 8 concurrent writes
 * survived without a lock, 8 of 8 with one).
 *
 * **Every lock carries an ownership token, and no process ever deletes a lock it does not
 * own.** Without that, two failure modes silently restore lost updates: two processes both
 * judge one stale lock and the second's delete removes a *third* process's fresh lock; and a
 * holder whose lock was broken for being slow deletes its successor's lock on the way out.
 * Both end with two processes inside the critical section at once.
 */
export async function withFileLock<T>(resource: string, operation: () => Promise<T>): Promise<T> {
  // The lock is `<resource>.lock`. `resource` is only a NAME — it need not exist, and need
  // not be a file at all, so this also guards stores kept somewhere else entirely (the My
  // Libraries manifest lives in LocalStorage, which has no atomic primitive of its own).
  const lockPath = `${resource}.lock`;
  const token = `${process.pid}-${randomUUID()}`;
  await mkdir(dirname(resource), { recursive: true });

  for (let attempt = 0; attempt < LOCK_ATTEMPTS; attempt += 1) {
    let acquired = false;

    try {
      const handle = await open(lockPath, "wx");

      try {
        await handle.writeFile(token, "utf8");
      } finally {
        await handle.close().catch(() => undefined);
      }

      acquired = true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException)?.code !== "EEXIST") {
        throw error;
      }
    }

    if (acquired) {
      try {
        return await operation();
      } finally {
        // Only ever remove OUR lock. If it was broken while we ran, the file now belongs to
        // a successor and deleting it would put two writers in the critical section.
        await removeLockIfOwned(lockPath, token);
      }
    }

    await breakLockIfStale(lockPath);
    await new Promise((resolve) => setTimeout(resolve, LOCK_RETRY_MS));
  }

  throw new Error("Could not save — another Context7 command is still writing. Try again.");
}

/** Reclaims a lock whose holder died, without touching a lock that has since been replaced. */
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

  // Keyed on the token we just judged stale: if another process already reclaimed it, the
  // token differs and this is a no-op instead of deleting the new holder's lock.
  await removeLockIfOwned(lockPath, holder);
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
