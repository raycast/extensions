import { environment } from "@raycast/api";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { setTimeout } from "node:timers/promises";
import { lock } from "proper-lockfile";

async function acquireLock(): Promise<() => Promise<void>> {
  // Commands and AI tools share a support path, but may also share a backend
  // PID. A worker-owned heartbeat allows recovery after worker termination
  // without relying on that PID or reserving a TCP port. Use a new name so
  // legacy PID-owned lock directories cannot block acquisition.
  await mkdir(environment.supportPath, { recursive: true });
  const lockPath = join(environment.supportPath, "oauth-credentials-v2");
  const deadline = Date.now() + 15_000;
  while (true) {
    try {
      return await lock(lockPath, {
        realpath: false,
        stale: 5_000,
        update: 1_000,
        retries: 0,
      });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ELOCKED") throw error;
      if (Date.now() >= deadline) {
        throw new Error("X authentication is busy. Finish any open X login, then retry.");
      }
      await setTimeout(100);
    }
  }
}

export async function withOAuthLock<T>(operation: () => Promise<T>): Promise<T> {
  const release = await acquireLock();
  try {
    return await operation();
  } finally {
    await release();
  }
}
