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
          this.removeLock();
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
        fs.unlinkSync(this.lockFile);
      }
      if (fs.existsSync(this.lockDir)) {
        fs.rmdirSync(this.lockDir);
      }
    } catch {
      // Lock was already released or never fully acquired — nothing to clean up
    }
  }

  private writeLockContent(): void {
    fs.writeFileSync(this.lockFile, `${process.pid}:${Date.now()}`);
  }

  private tryBreakStaleLock(): boolean {
    try {
      const content = fs.readFileSync(this.lockFile, "utf-8");
      const parts = content.split(":");
      const pid = parseInt(parts[0] ?? "", 10);
      const timestamp = parseInt(parts[1] ?? "", 10);

      if (isNaN(timestamp) || isNaN(pid)) {
        // Corrupt lock file — treat as stale and break immediately
        this.removeLock();
        return true;
      }

      const isStale = Date.now() - timestamp > CrossProcessMutex.STALE_THRESHOLD_MS;
      if (!isStale) {
        return false;
      }

      // Timestamp is stale — verify the holder process is actually dead before breaking
      if (!this.isProcessAlive(pid)) {
        this.removeLock();
        return true;
      }

      // Process is alive but hasn't refreshed the heartbeat. This should be rare
      // (heartbeat fires every 2 s, stale threshold is 15 s). Do NOT break; let
      // the holder finish and release naturally.
      return false;
    } catch {
      // Could not read the lock file (e.g. race: holder just released) — retry acquire
      return false;
    }
  }

  private isProcessAlive(pid: number): boolean {
    try {
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  }

  private removeLock(): void {
    try {
      if (fs.existsSync(this.lockFile)) fs.unlinkSync(this.lockFile);
      if (fs.existsSync(this.lockDir)) fs.rmdirSync(this.lockDir);
    } catch {
      // Ignore removal errors
    }
  }
}
