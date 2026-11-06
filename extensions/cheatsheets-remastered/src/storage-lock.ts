import { mkdir } from "node:fs/promises";
import path from "node:path";
import lockfile from "proper-lockfile";
import type { Lock } from "./storage";

export function createStorageLock(supportPath: string): Lock {
  return async (work) => {
    await mkdir(supportPath, { recursive: true });
    let release: () => Promise<void>;
    try {
      release = await lockfile.lock(path.join(supportPath, "library-write"), {
        realpath: false,
        stale: 30000,
        retries: { retries: 15, minTimeout: 100, maxTimeout: 500 },
      });
    } catch {
      throw new Error("Storage is busy in another command. Retry in a moment.");
    }
    try {
      return await work();
    } finally {
      await release();
    }
  };
}
