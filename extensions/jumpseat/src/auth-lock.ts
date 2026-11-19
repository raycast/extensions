import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";

const LOCK_NAME = "auth-storage.lock";
const TAKEOVER_NAME = "auth-storage.lock.takeover";
const OWNER_FILE = "owner";
const RETRY_MS = 20;
// Critical sections only touch local storage, so a lock this old was left by
// a process that died while holding it.
const STALE_MS = 10_000;

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function age(path: string): Promise<number | null> {
  try {
    return Date.now() - (await stat(path)).mtimeMs;
  } catch {
    return null;
  }
}

async function tryCreate(path: string): Promise<boolean> {
  try {
    await mkdir(path);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") return false;
    throw error;
  }
}

// Removes a stale lock without ever removing a live one. Contenders take a
// separate takeover lock and re-check the lock under it, so after one of them
// removes the stale lock and a new owner creates a fresh one, the next sees
// that fresh lock and leaves it alone.
async function removeStaleLock(lock: string, takeover: string): Promise<void> {
  if (!(await tryCreate(takeover))) {
    // A takeover lock is held only for a stat and a removal; one this old
    // belongs to a process that died mid-takeover.
    const takeoverAge = await age(takeover);
    if (takeoverAge !== null && takeoverAge > STALE_MS) {
      await rm(takeover, { recursive: true, force: true });
    }
    return;
  }
  try {
    const lockAge = await age(lock);
    if (lockAge !== null && lockAge > STALE_MS) {
      await rm(lock, { recursive: true, force: true });
    }
  } finally {
    await rm(takeover, { recursive: true, force: true });
  }
}

async function release(lock: string, owner: string): Promise<void> {
  const current = await readFile(join(lock, OWNER_FILE), "utf8").catch(
    () => null,
  );
  // Only remove the lock this caller still owns.
  if (current === owner) await rm(lock, { recursive: true, force: true });
}

/**
 * Runs `critical` while holding a lock shared by every command process.
 *
 * Raycast runs each command in its own process, and its token store has no
 * compare-and-set. Token writes that depend on what is currently stored take
 * this lock so that reading and writing happen as one step. Creating a
 * directory is atomic, so it serves as the lock.
 */
export async function withAuthStorageLock<T>(
  directory: string,
  critical: () => Promise<T>,
): Promise<T> {
  const lock = join(directory, LOCK_NAME);
  const takeover = join(directory, TAKEOVER_NAME);
  const owner = randomUUID();
  await mkdir(directory, { recursive: true });
  for (;;) {
    if (await tryCreate(lock)) {
      await writeFile(join(lock, OWNER_FILE), owner);
      break;
    }
    const lockAge = await age(lock);
    if (lockAge !== null && lockAge > STALE_MS) {
      await removeStaleLock(lock, takeover);
      continue;
    }
    await sleep(RETRY_MS);
  }
  try {
    return await critical();
  } finally {
    await release(lock, owner);
  }
}
