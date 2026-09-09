import fs from "node:fs";
import path from "node:path";

export class CrossProcessMutex {
  private readonly lockDir: string;
  private readonly lockFile: string;
  private readonly acquireTimeoutMs: number;
  private static readonly HEARTBEAT_INTERVAL_MS = 2000;
  private static readonly STALE_THRESHOLD_MS = 15000;
  private static readonly DEFAULT_ACQUIRE_TIMEOUT_MS = 5000;

  constructor(lockDir: string, acquireTimeoutMs: number = CrossProcessMutex.DEFAULT_ACQUIRE_TIMEOUT_MS) {
    this.lockDir = lockDir;
    this.lockFile = path.join(this.lockDir, "pid.txt");
    this.acquireTimeoutMs = acquireTimeoutMs;
  }

  async runExclusive<T>(task: () => Promise<T>): Promise<T> {
    const start = Date.now();
    let acquired = false;

    while (Date.now() - start < this.acquireTimeoutMs) {
      try {
        fs.mkdirSync(this.lockDir);
        try {
          this.writeLockContent();
        } catch (writeErr) {
          this.tryReclaimStaleLockDir();
          throw writeErr;
        }
        acquired = true;
        break;
      } catch (e: unknown) {
        const err = e as { code?: string };
        if (err.code === "EEXIST") {
          if (this.tryBreakStaleLock()) {
            continue;
          }
          await new Promise((resolve) => setTimeout(resolve, 50));
        } else if (err.code === "ENOENT") {
          fs.mkdirSync(path.dirname(this.lockDir), { recursive: true });
          continue;
        } else {
          throw err;
        }
      }
    }

    if (!acquired) {
      throw new Error("Could not acquire cross-process storage lock. Please try again.");
    }

    const heartbeat = setInterval(() => {
      try {
        this.writeLockContent();
      } catch {
        // Ignore heartbeat write errors; the lock dir may have been removed
      }
    }, CrossProcessMutex.HEARTBEAT_INTERVAL_MS);

    try {
      return await task();
    } finally {
      clearInterval(heartbeat);
      this.releaseIfOwned();
    }
  }

  private releaseIfOwned(): void {
    try {
      if (!fs.existsSync(this.lockDir)) {
        return;
      }
      if (fs.existsSync(this.lockFile)) {
        const content = fs.readFileSync(this.lockFile, "utf-8");
        const ownerPid = parseInt(content.split(":")[0] ?? "", 10);
        if (ownerPid !== process.pid) {
          // Lock was reclaimed by another process — do not touch it
          return;
        }
      }
      this.tryReclaimStaleLockDir();
    } catch {
      // Lock was already released or never fully acquired — nothing to clean up
    }
  }

  private writeLockContent(): void {
    const tmpFile = path.join(
      this.lockDir,
      `.pid.tmp.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}`,
    );
    fs.writeFileSync(tmpFile, `${process.pid}:${Date.now()}`);
    fs.renameSync(tmpFile, this.lockFile);
  }

  private tryBreakStaleLock(): boolean {
    try {
      if (!fs.existsSync(this.lockDir)) {
        return false;
      }

      // Check for aged, incomplete lock (lock directory exists, but pid.txt was never written)
      if (!fs.existsSync(this.lockFile)) {
        try {
          const dirStat = fs.statSync(this.lockDir);
          const dirAge = Date.now() - dirStat.mtimeMs;
          if (dirAge > CrossProcessMutex.STALE_THRESHOLD_MS) {
            return this.tryReclaimStaleLockDir();
          }
        } catch {
          return false;
        }
        return false;
      }

      const content = fs.readFileSync(this.lockFile, "utf-8");
      const parts = content.split(":");
      const pid = parseInt(parts[0] ?? "", 10);
      const timestamp = parseInt(parts[1] ?? "", 10);

      if (isNaN(timestamp) || isNaN(pid)) {
        // Corrupt lock file — check age before breaking
        try {
          const fileStat = fs.statSync(this.lockFile);
          if (Date.now() - fileStat.mtimeMs > CrossProcessMutex.STALE_THRESHOLD_MS) {
            return this.tryReclaimStaleLockDir();
          }
        } catch {
          return false;
        }
        return false;
      }

      const isStale = Date.now() - timestamp > CrossProcessMutex.STALE_THRESHOLD_MS;
      if (!isStale) {
        return false;
      }

      // Timestamp is stale — verify the holder process is actually dead before breaking
      if (!this.isProcessAlive(pid)) {
        return this.tryReclaimStaleLockDir();
      }

      return false;
    } catch {
      // Could not read the lock file (e.g. race: holder just released) — retry acquire
      return false;
    }
  }

  private tryReclaimStaleLockDir(): boolean {
    const parentDir = path.dirname(this.lockDir);
    const staleDir = path.join(
      parentDir,
      `${path.basename(this.lockDir)}.stale.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}`,
    );

    try {
      fs.renameSync(this.lockDir, staleDir);
    } catch {
      // Another contender already reclaimed/renamed it, or it was released
      return false;
    }

    try {
      fs.rmSync(staleDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors on the stale directory
    }

    return true;
  }

  private isProcessAlive(pid: number): boolean {
    try {
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  }
}
