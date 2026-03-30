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
      // Verify it's actually our shell loop
      const comm = execSync(`ps -p ${pid} -o comm= 2>/dev/null`, { encoding: "utf-8" }).trim();
      return comm.includes("sh");
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
    const child = spawn("sh", ["-c", `while true; do afplay -v ${afplayVolume} "${filePath}"; done`], {
      detached: true,
      stdio: "ignore",
    });

    if (!child.pid) {
      console.error(`[AudioEngine] Failed to spawn afplay for ${soundId}`);
      return null;
    }
    child.unref();

    // Register PID
    const registry = this.readRegistry();
    // Remove any existing entry for this sound
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
      // Stop old process group, then start new
      try {
        process.kill(-entry.pid, "SIGTERM");
      } catch {
        // Already dead
      }
      this.startSound(soundId, filePath, newVolume);
    } else {
      // Not currently playing, just start fresh
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
