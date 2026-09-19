import fs from "node:fs";
import path from "node:path";

export interface MutexOptions {
  acquireTimeoutMs?: number;
  onBeforeReclaimForTesting?: () => void | Promise<void>;
  onBeforeRenameForTesting?: () => void | Promise<void>;
}

interface StaleLockSnapshot {
  dirIno: number;
  hasFile: boolean;
  fileIno?: number;
  content?: string;
}

export class CrossProcessMutex {
  private readonly lockDir: string;
  private readonly lockFile: string;
  private readonly reclaimDir: string;
  private readonly acquireTimeoutMs: number;
  private readonly onBeforeReclaimForTesting?: () => void | Promise<void>;
  private readonly onBeforeRenameForTesting?: () => void | Promise<void>;
  private static readonly HEARTBEAT_INTERVAL_MS = 2000;
  private static readonly STALE_THRESHOLD_MS = 15000;
  private static readonly DEFAULT_ACQUIRE_TIMEOUT_MS = 5000;

  constructor(lockDir: string, options?: number | MutexOptions) {
    this.lockDir = lockDir;
    this.lockFile = path.join(this.lockDir, "pid.txt");
    this.reclaimDir = `${this.lockDir}.reclaim`;
    if (typeof options === "number") {
      this.acquireTimeoutMs = options;
    } else {
      this.acquireTimeoutMs = options?.acquireTimeoutMs ?? CrossProcessMutex.DEFAULT_ACQUIRE_TIMEOUT_MS;
      this.onBeforeReclaimForTesting = options?.onBeforeReclaimForTesting;
      this.onBeforeRenameForTesting = options?.onBeforeRenameForTesting;
    }
  }

  async runExclusive<T>(task: () => Promise<T>): Promise<T> {
    const start = Date.now();
    let acquired = false;

    while (Date.now() - start < this.acquireTimeoutMs) {
      // If a recovery or reclaim operation is active, do not attempt to acquire.
      // Wait for the transition / restoration to settle.
      if (this.isReclaimInProgress()) {
        await new Promise((resolve) => setTimeout(resolve, 25));
        continue;
      }

      try {
        fs.mkdirSync(this.lockDir);
        let createdDirIno: number | undefined;
        try {
          const dirStat = fs.statSync(this.lockDir);
          createdDirIno = dirStat.ino;
          this.writeLockContent();
        } catch (writeErr) {
          if (createdDirIno !== undefined) {
            await this.tryReclaimStaleLockDir({
              dirIno: createdDirIno,
              hasFile: false,
            });
          }
          throw writeErr;
        }

        // Post-creation check: if a reclaim barrier became active concurrently,
        // verify our directory wasn't moved or replaced during acquisition
        if (this.isReclaimInProgress()) {
          try {
            const currentStat = fs.statSync(this.lockDir);
            if (currentStat.ino !== createdDirIno) {
              await new Promise((resolve) => setTimeout(resolve, 25));
              continue;
            }
          } catch {
            await new Promise((resolve) => setTimeout(resolve, 25));
            continue;
          }
        }

        acquired = true;
        break;
      } catch (e: unknown) {
        const err = e as { code?: string };
        if (err.code === "EEXIST") {
          if (await this.tryBreakStaleLock()) {
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
      await this.releaseIfOwned();
    }
  }

  private async releaseIfOwned(): Promise<void> {
    try {
      if (!fs.existsSync(this.lockDir)) {
        return;
      }
      if (!fs.existsSync(this.lockFile)) {
        return;
      }
      const dirStat = fs.statSync(this.lockDir);
      const fileStat = fs.statSync(this.lockFile);
      const content = fs.readFileSync(this.lockFile, "utf-8");
      const ownerPid = parseInt(content.split(":")[0] ?? "", 10);
      if (ownerPid !== process.pid) {
        // Lock was reclaimed by another process — do not touch it
        return;
      }
      const snapshot: StaleLockSnapshot = {
        dirIno: dirStat.ino,
        hasFile: true,
        fileIno: fileStat.ino,
        content,
      };
      await this.tryReclaimStaleLockDir(snapshot);
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

  private async tryBreakStaleLock(): Promise<boolean> {
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
            const snapshot: StaleLockSnapshot = {
              dirIno: dirStat.ino,
              hasFile: false,
            };
            if (this.onBeforeReclaimForTesting) {
              await this.onBeforeReclaimForTesting();
            }
            return await this.tryReclaimStaleLockDir(snapshot);
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
          const dirStat = fs.statSync(this.lockDir);
          const fileStat = fs.statSync(this.lockFile);
          if (Date.now() - fileStat.mtimeMs > CrossProcessMutex.STALE_THRESHOLD_MS) {
            const snapshot: StaleLockSnapshot = {
              dirIno: dirStat.ino,
              hasFile: true,
              fileIno: fileStat.ino,
              content,
            };
            if (this.onBeforeReclaimForTesting) {
              await this.onBeforeReclaimForTesting();
            }
            return await this.tryReclaimStaleLockDir(snapshot);
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
        try {
          const dirStat = fs.statSync(this.lockDir);
          const fileStat = fs.statSync(this.lockFile);
          const snapshot: StaleLockSnapshot = {
            dirIno: dirStat.ino,
            hasFile: true,
            fileIno: fileStat.ino,
            content,
          };
          if (this.onBeforeReclaimForTesting) {
            await this.onBeforeReclaimForTesting();
          }
          return await this.tryReclaimStaleLockDir(snapshot);
        } catch {
          return false;
        }
      }

      return false;
    } catch {
      // Could not read the lock file (e.g. race: holder just released) — retry acquire
      return false;
    }
  }

  private async tryReclaimStaleLockDir(snapshot: StaleLockSnapshot): Promise<boolean> {
    if (!this.acquireReclaimBarrier()) {
      return false;
    }

    try {
      if (!this.isSnapshotMatch(this.lockDir, snapshot)) {
        return false;
      }

      if (this.onBeforeRenameForTesting) {
        await this.onBeforeRenameForTesting();
      }

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

      if (!this.isSnapshotMatch(staleDir, snapshot)) {
        // Race: live lock was moved right before renameSync. Restore it immediately!
        // Because the reclaim barrier is active, no other command could have acquired this.lockDir.
        try {
          fs.renameSync(staleDir, this.lockDir);
        } catch {
          // If restore fails, do not touch destination
        }
        return false;
      }

      try {
        fs.rmSync(staleDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors on the stale directory
      }

      return true;
    } finally {
      this.releaseReclaimBarrier();
    }
  }

  private isReclaimInProgress(): boolean {
    try {
      if (!fs.existsSync(this.reclaimDir)) {
        return false;
      }
      const stat = fs.statSync(this.reclaimDir);
      if (Date.now() - stat.mtimeMs > CrossProcessMutex.STALE_THRESHOLD_MS) {
        try {
          fs.rmdirSync(this.reclaimDir);
        } catch {
          // Ignore
        }
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  private acquireReclaimBarrier(): boolean {
    try {
      fs.mkdirSync(this.reclaimDir);
      return true;
    } catch (e: unknown) {
      const err = e as { code?: string };
      if (err.code === "EEXIST") {
        if (this.isReclaimInProgress()) {
          return false;
        }
        try {
          fs.mkdirSync(this.reclaimDir);
          return true;
        } catch {
          return false;
        }
      }
      return false;
    }
  }

  private releaseReclaimBarrier(): void {
    try {
      fs.rmdirSync(this.reclaimDir);
    } catch {
      // Ignore cleanup error
    }
  }

  private isSnapshotMatch(targetDir: string, snapshot: StaleLockSnapshot): boolean {
    try {
      if (!fs.existsSync(targetDir)) {
        return false;
      }
      const dirStat = fs.statSync(targetDir);
      if (dirStat.ino !== snapshot.dirIno) {
        return false;
      }

      const targetFile = path.join(targetDir, "pid.txt");
      if (snapshot.hasFile) {
        if (!fs.existsSync(targetFile)) {
          return false;
        }
        const fileStat = fs.statSync(targetFile);
        if (snapshot.fileIno !== undefined && fileStat.ino !== snapshot.fileIno) {
          return false;
        }
        if (snapshot.content !== undefined) {
          const currentContent = fs.readFileSync(targetFile, "utf-8");
          if (currentContent !== snapshot.content) {
            return false;
          }
        }
      } else {
        if (fs.existsSync(targetFile)) {
          return false;
        }
      }

      return true;
    } catch {
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
}
