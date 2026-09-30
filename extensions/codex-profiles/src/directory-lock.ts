import { randomUUID } from "node:crypto";
import { mkdir, readdir, rename, rmdir, stat, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";

const DEFAULT_WAIT_TIMEOUT_MS = 15_000;
const EMPTY_LOCK_GRACE_MS = 30_000;

interface DirectoryLockOptions {
  waitTimeoutMs?: number;
  retryDelayMs?: number;
  timeoutMessage?: string;
}

function processIsRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code !== "ESRCH";
  }
}

async function removeAbandonedLock(lockPath: string): Promise<boolean> {
  const entries = await readdir(lockPath).catch(() => []);
  const ownerFile = entries.find((entry) => /^owner-\d+-[0-9a-f-]+$/.test(entry));

  if (ownerFile) {
    const match = ownerFile.match(/^owner-(\d+)-/);
    if (!match || processIsRunning(Number(match[1]))) return false;

    // Removing the exact observed marker, then only an empty directory, means
    // a late owner can never remove a lock subsequently acquired by someone else.
    await unlink(join(lockPath, ownerFile)).catch(() => undefined);
    try {
      await rmdir(lockPath);
      return true;
    } catch {
      return false;
    }
  }

  // Recover the tiny mkdir-before-owner-marker crash window, but never reclaim
  // a marked lock based only on its age.
  const details = await stat(lockPath).catch(() => undefined);
  if (!details || Date.now() - details.mtimeMs < EMPTY_LOCK_GRACE_MS) return false;
  try {
    await rmdir(lockPath);
    return true;
  } catch {
    return false;
  }
}

export async function withDirectoryLock<T>(
  lockPath: string,
  operation: () => Promise<T>,
  options: DirectoryLockOptions = {},
): Promise<T> {
  const timeoutMs = options.waitTimeoutMs ?? DEFAULT_WAIT_TIMEOUT_MS;
  const retryDelayMs = options.retryDelayMs ?? 50;
  const token = randomUUID();
  const ownerName = `owner-${process.pid}-${token}`;
  const ownerFile = join(lockPath, ownerName);
  const pendingPath = `${lockPath}.pending-${token}`;
  const deadline = Date.now() + timeoutMs;

  while (true) {
    try {
      // Publish the lock directory only after it contains its owner marker.
      // That closes the mkdir-then-marker gap where a contender might mistake
      // a just-created lock for an abandoned, empty one.
      await mkdir(pendingPath, { mode: 0o700 });
      try {
        await writeFile(join(pendingPath, ownerName), String(process.pid), { flag: "wx", mode: 0o600 });
        await rename(pendingPath, lockPath);
      } catch (error) {
        await unlink(join(pendingPath, ownerName)).catch(() => undefined);
        await rmdir(pendingPath).catch(() => undefined);
        throw error;
      }
      break;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "EEXIST" && code !== "ENOTEMPTY") throw error;
      if (await removeAbandonedLock(lockPath)) continue;
      if (Date.now() >= deadline) {
        throw new Error(options.timeoutMessage ?? "Another profile operation is still in progress. Try again shortly.");
      }
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    }
  }

  try {
    return await operation();
  } finally {
    await unlink(ownerFile).catch(() => undefined);
    await rmdir(lockPath).catch(() => undefined);
  }
}
