import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { lstat, mkdir, readFile, readlink, symlink, unlink } from "node:fs/promises";
import path from "node:path";

type FileLockOptions = {
  retryMilliseconds: number;
  staleMilliseconds: number;
  timeoutMilliseconds: number;
};

type LockOwner = {
  pid: number;
  startedAt: string;
};

export async function withFileLock<T>(
  lockPath: string,
  operation: () => Promise<T>,
  options: FileLockOptions,
): Promise<T> {
  const deadline = Date.now() + options.timeoutMilliseconds;
  const ownerToken = await createOwnerToken();
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
          const owner = await readLockOwner(lockPath);
          if (owner === undefined || !(await isOriginalProcessAlive(owner))) {
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

async function createOwnerToken(): Promise<string> {
  const startedAt = await getProcessStartIdentity(process.pid);
  if (startedAt === undefined) {
    throw new Error("Unable to identify the Dimmer state-lock process.");
  }

  const owner = Buffer.from(JSON.stringify({ pid: process.pid, startedAt }), "utf8").toString("base64url");
  return `${owner}.${randomUUID()}`;
}

async function readLockOwner(lockPath: string): Promise<LockOwner | undefined> {
  const token = await readLockToken(lockPath);
  try {
    const encodedOwner = token.split(".", 1)[0];
    const value = JSON.parse(Buffer.from(encodedOwner, "base64url").toString("utf8")) as Partial<LockOwner>;
    if (Number.isSafeInteger(value.pid) && Number(value.pid) > 0 && typeof value.startedAt === "string") {
      return { pid: Number(value.pid), startedAt: value.startedAt };
    }
  } catch {
    // Locks from earlier versions do not contain a process-start identity.
  }
  return undefined;
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

async function isOriginalProcessAlive(owner: LockOwner): Promise<boolean> {
  if (!isProcessAlive(owner.pid)) {
    return false;
  }

  const startedAt = await getProcessStartIdentity(owner.pid);
  return startedAt === undefined || startedAt === owner.startedAt;
}

function getProcessStartIdentity(pid: number): Promise<string | undefined> {
  return new Promise((resolve) => {
    execFile("/bin/ps", ["-p", String(pid), "-o", "lstart="], { encoding: "utf8" }, (error, stdout) => {
      const identity = stdout.trim();
      resolve(error || identity.length === 0 ? undefined : identity);
    });
  });
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
