import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdir, readFile, readdir, rename, rmdir, stat, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";

const DEFAULT_WAIT_TIMEOUT_MS = 15_000;
const DEFAULT_EMPTY_LOCK_GRACE_MS = 30_000;
const execFileAsync = promisify(execFile);

interface DirectoryLockOptions {
  waitTimeoutMs?: number;
  retryDelayMs?: number;
  timeoutMessage?: string;
  emptyLockGraceMs?: number;
}

async function getProcessStartIdentity(pid: number): Promise<string | undefined> {
  try {
    const { stdout } = await execFileAsync("/bin/ps", ["-p", String(pid), "-o", "lstart="], {
      env: { ...process.env, LC_ALL: "C" },
    });
    return stdout.trim() || undefined;
  } catch {
    return undefined;
  }
}

async function processOwnsLock(pid: number, ownerFilePath: string): Promise<boolean> {
  try {
    process.kill(pid, 0);
  } catch (error) {
    return (error as NodeJS.ErrnoException).code !== "ESRCH";
  }

  let marker: { pid?: unknown; processStartIdentity?: unknown };
  try {
    marker = JSON.parse(await readFile(ownerFilePath, "utf8")) as typeof marker;
  } catch {
    // Older markers only recorded the PID. Keep them until that process exits.
    return true;
  }
  if (marker.pid !== pid) return true;

  if (typeof marker.processStartIdentity === "string") {
    const runningIdentity = await getProcessStartIdentity(pid);
    return runningIdentity === undefined || runningIdentity === marker.processStartIdentity;
  }

  // Legacy markers cannot distinguish PID reuse safely. Keep them until the PID exits.
  return true;
}

async function removeAbandonedLock(lockPath: string, emptyLockGraceMs: number): Promise<boolean> {
  const entries = await readdir(lockPath).catch(() => []);
  const ownerFile = entries.find((entry) => /^owner-\d+-[0-9a-f-]+$/.test(entry));
  if (ownerFile) {
    const match = ownerFile.match(/^owner-(\d+)-/);
    if (!match || (await processOwnsLock(Number(match[1]), join(lockPath, ownerFile)))) return false;
    await unlink(join(lockPath, ownerFile)).catch(() => undefined);
    try {
      await rmdir(lockPath);
      return true;
    } catch {
      return false;
    }
  }

  // Recover a mkdir-before-marker crash, but never age out a marked live lock.
  const details = await stat(lockPath).catch(() => undefined);
  if (!details || Date.now() - details.mtimeMs < emptyLockGraceMs) return false;
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
  const emptyLockGraceMs = options.emptyLockGraceMs ?? DEFAULT_EMPTY_LOCK_GRACE_MS;
  const token = randomUUID();
  const ownerName = `owner-${process.pid}-${token}`;
  const ownerFile = join(lockPath, ownerName);
  const pendingPath = `${lockPath}.pending-${token}`;
  const processStartIdentity = await getProcessStartIdentity(process.pid);
  if (!processStartIdentity) throw new Error("Could not verify the current process identity.");
  const deadline = Date.now() + timeoutMs;

  while (true) {
    try {
      // Publish the lock only after its owner marker exists.
      await mkdir(pendingPath, { mode: 0o700 });
      try {
        await writeFile(join(pendingPath, ownerName), JSON.stringify({ pid: process.pid, processStartIdentity }), {
          flag: "wx",
          mode: 0o600,
        });
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
      if (await removeAbandonedLock(lockPath, emptyLockGraceMs)) continue;
      if (Date.now() >= deadline) {
        throw new Error(options.timeoutMessage ?? "Another operation is still in progress. Try again shortly.");
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
