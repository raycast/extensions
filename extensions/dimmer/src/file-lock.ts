import { randomUUID } from "node:crypto";
import { lstat, mkdir, readFile, readlink, symlink, unlink } from "node:fs/promises";
import path from "node:path";

type FileLockOptions = {
  retryMilliseconds: number;
  staleMilliseconds: number;
  timeoutMilliseconds: number;
};

export async function withFileLock<T>(
  lockPath: string,
  operation: () => Promise<T>,
  options: FileLockOptions,
): Promise<T> {
  const deadline = Date.now() + options.timeoutMilliseconds;
  const ownerToken = `${process.pid}:${randomUUID()}`;
  await mkdir(path.dirname(lockPath), { recursive: true });

  while (Date.now() < deadline) {
    try {
      await symlink(ownerToken, lockPath, "file");
      try {
        return await operation();
      } finally {
        await releaseOwnedLock(lockPath, ownerToken);
      }
    } catch (error) {
      if (!isNodeError(error, "EEXIST")) {
        throw error;
      }

      try {
        const lockStats = await lstat(lockPath);
        if (Date.now() - lockStats.mtimeMs >= options.staleMilliseconds) {
          const ownerPID = await readLockOwnerPID(lockPath);
          if (ownerPID === undefined || !isProcessAlive(ownerPID)) {
            await unlink(lockPath);
            continue;
          }
        }
      } catch (lockError) {
        if (!isNodeError(lockError, "ENOENT")) {
          throw lockError;
        }
      }

      await delay(options.retryMilliseconds);
    }
  }

  throw new Error("Timed out while waiting for a file lock.");
}

async function releaseOwnedLock(lockPath: string, ownerToken: string): Promise<void> {
  try {
    if ((await readLockToken(lockPath)) === ownerToken) {
      await unlink(lockPath);
    }
  } catch (error) {
    if (!isNodeError(error, "ENOENT")) {
      throw error;
    }
  }
}

async function readLockOwnerPID(lockPath: string): Promise<number | undefined> {
  const token = await readLockToken(lockPath);
  const ownerPID = Number.parseInt(token.split(":", 1)[0], 10);
  return Number.isSafeInteger(ownerPID) && ownerPID > 0 ? ownerPID : undefined;
}

async function readLockToken(lockPath: string): Promise<string> {
  try {
    return await readlink(lockPath, "utf8");
  } catch (error) {
    if (isNodeError(error, "EINVAL")) {
      return (await readFile(lockPath, "utf8")).trim();
    }
    throw error;
  }
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (isNodeError(error, "ESRCH")) {
      return false;
    }
    if (isNodeError(error, "EPERM")) {
      return true;
    }
    throw error;
  }
}

function isNodeError(error: unknown, code: string): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error && error.code === code;
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
