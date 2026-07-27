import { mkdir, open, stat, unlink } from "node:fs/promises";
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
  await mkdir(path.dirname(lockPath), { recursive: true });

  while (Date.now() < deadline) {
    try {
      const lock = await open(lockPath, "wx", 0o600);
      try {
        await lock.writeFile(`${process.pid}\n`, "utf8");
        return await operation();
      } finally {
        await lock.close();
        await unlink(lockPath).catch((error: unknown) => {
          if (!isNodeError(error, "ENOENT")) {
            throw error;
          }
        });
      }
    } catch (error) {
      if (!isNodeError(error, "EEXIST")) {
        throw error;
      }

      try {
        const lockStats = await stat(lockPath);
        if (Date.now() - lockStats.mtimeMs >= options.staleMilliseconds) {
          await unlink(lockPath);
          continue;
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

function isNodeError(error: unknown, code: string): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error && error.code === code;
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
