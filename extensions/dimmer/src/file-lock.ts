import { constants } from "node:fs";
import { mkdir, open, type FileHandle } from "node:fs/promises";
import path from "node:path";

type FileLockOptions = {
  retryMilliseconds: number;
  timeoutMilliseconds: number;
};

// macOS exposes O_EXLOCK through open(2), but Node does not include it in fs.constants.
// Combined with O_NONBLOCK, it provides a kernel-managed lock that is released if the
// command exits or crashes, so stale lock files never need to be deleted by another process.
const O_EXLOCK = 0x00000020;

export async function withFileLock<T>(
  lockPath: string,
  operation: () => Promise<T>,
  options: FileLockOptions,
): Promise<T> {
  const deadline = Date.now() + options.timeoutMilliseconds;
  const flags = constants.O_CREAT | constants.O_RDWR | constants.O_NONBLOCK | O_EXLOCK;
  await mkdir(path.dirname(lockPath), { recursive: true });

  while (Date.now() < deadline) {
    let lockHandle: FileHandle;
    try {
      lockHandle = await open(lockPath, flags, 0o600);
    } catch (error) {
      if (!isLockBusyError(error)) {
        throw error;
      }

      await delay(options.retryMilliseconds);
      continue;
    }

    try {
      return await operation();
    } finally {
      await lockHandle.close();
    }
  }

  throw new Error("Timed out while waiting for a file lock.");
}

function isLockBusyError(error: unknown): error is NodeJS.ErrnoException {
  return isNodeError(error, "EAGAIN") || isNodeError(error, "EWOULDBLOCK");
}

function isNodeError(error: unknown, code: string): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error && error.code === code;
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
