import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";

/*
 * One lock for everything that writes a vault's bookmarks.json: every Raycast command (each runs in
 * its own worker, so in-memory state can't coordinate them) and MarkdownOS itself.
 *
 * The lock is a file created with O_EXCL ("wx"), which only one process can win. It holds a token
 * naming its owner, so a release can never remove a lock someone else now holds. Holding it spans
 * only read → change → write of the file itself: network work (page titles, favicons) happens
 * before a mutation takes the lock, never while holding it.
 *
 * Must stay in step with main/handlers/bookmarks-lock.ts in MarkdownOS — same file name, same
 * token format, same staleness rule — or the two sides stop excluding each other.
 */
export const LOCK_FILE_NAME = "bookmarks.json.lock";

/** A lock older than this is from a writer that died mid-write: a real hold lasts milliseconds. */
const STALE_MS = 10_000;
/** How long a mutation waits for a lock that is genuinely held before giving up. */
const ACQUIRE_TIMEOUT_MS = 5_000;
const RETRY_MS = 25;

interface LockInfo {
  pid: number;
  token: string;
  at: number;
}

function parseLock(raw: string): LockInfo | null {
  try {
    const info = JSON.parse(raw) as Partial<LockInfo>;
    if (typeof info.pid === "number" && typeof info.token === "string" && typeof info.at === "number") {
      return info as LockInfo;
    }
  } catch {
    // Written by a holder that hasn't finished writing its token yet — judged by mtime below.
  }
  return null;
}

function processIsAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    // EPERM: it exists but belongs to someone else — still alive.
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

function isMissing(error: unknown): boolean {
  return (error as NodeJS.ErrnoException).code === "ENOENT";
}

/** Removes the lock at `lockPath` if it is stale. True when the lock is now gone, so the caller can
 *  retry at once; false when it's still held (or can't be judged) and the caller should wait. */
async function breakIfStale(lockPath: string): Promise<boolean> {
  let raw: string;
  let mtimeMs: number;
  try {
    [raw, { mtimeMs }] = await Promise.all([fs.readFile(lockPath, "utf8"), fs.stat(lockPath)]);
  } catch (error) {
    return isMissing(error); // Released between our failed create and this read.
  }
  const info = parseLock(raw);
  const heldSince = info ? info.at : mtimeMs;
  // A dead owner is only conclusive for a lock that parsed: every Raycast command shares one pid
  // with Raycast itself, so a crashed worker leaves a lock whose pid is still alive — that case is
  // caught by age instead.
  const stale = Date.now() - heldSince > STALE_MS || (info !== null && !processIsAlive(info.pid));
  if (!stale) return false;
  // Re-read right before removing: if another waiter already broke it and took a fresh lock in the
  // meantime, the content has changed and that lock must be left alone.
  try {
    if ((await fs.readFile(lockPath, "utf8")) !== raw) return false;
    await fs.unlink(lockPath);
    return true;
  } catch (error) {
    return isMissing(error);
  }
}

export async function withBookmarksLock<T>(bookmarksDir: string, run: () => Promise<T>): Promise<T> {
  await fs.mkdir(bookmarksDir, { recursive: true });
  const lockPath = path.join(bookmarksDir, LOCK_FILE_NAME);
  const token = `${process.pid}-${randomUUID()}`;
  const deadline = Date.now() + ACQUIRE_TIMEOUT_MS;

  for (;;) {
    try {
      const handle = await fs.open(lockPath, "wx");
      try {
        await handle.writeFile(JSON.stringify({ pid: process.pid, token, at: Date.now() } satisfies LockInfo));
      } finally {
        await handle.close();
      }
      break;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    }
    // Checked on every pass, including the retry-at-once one below, so no state of the lock file
    // (one that can't be read, say) can keep this loop going past the deadline.
    if (Date.now() > deadline) {
      throw new Error("MarkdownOS is busy saving bookmarks. Nothing was changed. Try again in a moment.");
    }
    if (!(await breakIfStale(lockPath))) await new Promise((resolve) => setTimeout(resolve, RETRY_MS));
  }

  try {
    return await run();
  } finally {
    // Only our own lock: if we were judged stale and someone else holds it now, it's theirs.
    try {
      const info = parseLock(await fs.readFile(lockPath, "utf8"));
      if (info?.token === token) await fs.unlink(lockPath);
    } catch {
      // Already gone.
    }
  }
}
