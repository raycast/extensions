import { spawn, execSync } from "child_process";
import fs from "fs";
import path from "path";
import type { PidEntry, PidRegistry } from "../types";
import { PID_REGISTRY_FILENAME } from "./constants";

export class AudioEngine {
  private registryPath: string;

  constructor(supportPath: string) {
    this.registryPath = path.join(supportPath, PID_REGISTRY_FILENAME);
  }

  // --- PID Registry ---

  readRegistry(): PidRegistry {
    try {
      if (!fs.existsSync(this.registryPath)) {
        return { entries: [], lastUpdated: Date.now() };
      }
      const raw = fs.readFileSync(this.registryPath, "utf-8");
      return JSON.parse(raw) as PidRegistry;
    } catch {
      return { entries: [], lastUpdated: Date.now() };
    }
  }

  private writeRegistry(registry: PidRegistry): void {
    registry.lastUpdated = Date.now();
    const dir = path.dirname(this.registryPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const tmp = this.registryPath + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(registry, null, 2));
    fs.renameSync(tmp, this.registryPath);
  }

  private isProcessAlive(pid: number): boolean {
    try {
      process.kill(pid, 0);
      // Verify it's the sh loop we spawned, not a recycled PID
      const comm = execSync(`ps -p ${pid} -o comm= 2>/dev/null`, { encoding: "utf-8" }).trim();
      return comm === "sh";
    } catch {
      return false;
    }
  }

  pruneStaleEntries(): PidEntry[] {
    const registry = this.readRegistry();
    const alive = registry.entries.filter((e) => this.isProcessAlive(e.pid));
    if (alive.length !== registry.entries.length) {
      this.writeRegistry({ ...registry, entries: alive });
    }
    return alive;
  }

  // --- Process Management ---

  startSound(soundId: string, filePath: string, volume: number): number | null {
    if (!fs.existsSync(filePath)) {
      console.error(`[AudioEngine] Sound file not found: ${filePath}`);
      return null;
    }

    const afplayVolume = Math.max(0, Math.min(1, volume / 100));

    // Spawn a detached shell loop so playback continues looping even when
    // the Raycast process is not running. The shell becomes the process
    // group leader (detached: true), so we can kill the whole group —
    // both the sh and any afplay child — with a single SIGTERM to -pid.
    const child = spawn("sh", ["-c", `while true; do afplay -v ${afplayVolume} "${filePath}"; done`], {
      detached: true,
      stdio: "ignore",
    });

    if (!child.pid) {
      console.error(`[AudioEngine] Failed to spawn loop for ${soundId}`);
      return null;
    }

    child.unref();

    const registry = this.readRegistry();
    registry.entries = registry.entries.filter((e) => e.soundId !== soundId);
    registry.entries.push({
      soundId,
      pid: child.pid,
      volume,
      startedAt: Date.now(),
    });
    this.writeRegistry(registry);

    return child.pid;
  }

  stopSound(soundId: string): void {
    const registry = this.readRegistry();
    const entry = registry.entries.find((e) => e.soundId === soundId);
    if (!entry) return;

    try {
      // Negative PID kills the entire process group (sh + afplay child)
      process.kill(-entry.pid, "SIGTERM");
    } catch {
      // Process already dead
    }

    registry.entries = registry.entries.filter((e) => e.soundId !== soundId);
    this.writeRegistry(registry);
  }

  stopAll(): void {
    const registry = this.readRegistry();
    for (const entry of registry.entries) {
      try {
        process.kill(-entry.pid, "SIGTERM");
      } catch {
        // Process already dead
      }
    }
    this.writeRegistry({ entries: [], lastUpdated: Date.now() });
  }

  changeVolume(soundId: string, filePath: string, newVolume: number): void {
    const registry = this.readRegistry();
    const entry = registry.entries.find((e) => e.soundId === soundId);

    if (entry && this.isProcessAlive(entry.pid)) {
      // Start the new loop first for a seamless transition, then kill the old group
      const newPid = this.startSound(soundId, filePath, newVolume);
      if (newPid) {
        try {
          process.kill(-entry.pid, "SIGTERM");
        } catch {
          // Already dead
        }
      }
    } else {
      this.startSound(soundId, filePath, newVolume);
    }
  }

  getRunningEntries(): PidEntry[] {
    return this.pruneStaleEntries();
  }

  isAnythingPlaying(): boolean {
    return this.getRunningEntries().length > 0;
  }

  getEntryForSound(soundId: string): PidEntry | undefined {
    return this.getRunningEntries().find((e) => e.soundId === soundId);
  }
}
