import { randomUUID } from "node:crypto";
import { readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

// A heartbeat separates a live job from a cancelled job whose Raycast process survives.
// Use a generous grace period to accommodate sleep/resume and temporary I/O failures.
const abandonedAfterMs = 24 * 60 * 60 * 1000;

export async function startJobLease(directory: string): Promise<() => Promise<void>> {
  let stopped = false;
  const update = async () => {
    const temporary = path.join(directory, `.active-${randomUUID()}.json`);
    try {
      await writeFile(temporary, JSON.stringify({ pid: process.pid, heartbeatAt: Date.now() }));
      await rename(temporary, path.join(directory, "active.json"));
    } finally {
      await rm(temporary, { force: true });
    }
  };
  await update();
  let pending = Promise.resolve();
  const timer = setInterval(() => {
    pending = pending
      .then(async () => {
        if (!stopped) await update();
      })
      .catch((error) => console.warn("Could not update media job lease:", error));
  }, 15_000);
  timer.unref();
  return async () => {
    stopped = true;
    clearInterval(timer);
    await pending;
  };
}

function processExists(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    // Permission errors mean the process may still be alive.
    return (error as NodeJS.ErrnoException).code !== "ESRCH";
  }
}

export async function applyRetention(root: string, keep: number, inputPath?: string): Promise<void> {
  try {
    const completed: { directory: string; time: number }[] = [];
    const cutoff = Date.now() - abandonedAfterMs;
    for (const entry of await readdir(root, { withFileTypes: true })) {
      if (!entry.isDirectory() || !entry.name.startsWith("media-")) continue;
      const directory = path.join(root, entry.name);
      // A user may select a previously cached file as their local input.
      if (inputPath && path.resolve(inputPath).startsWith(path.resolve(directory) + path.sep)) continue;
      try {
        const marker = JSON.parse(await readFile(path.join(directory, "completed.json"), "utf8"));
        if (typeof marker?.completedAt === "number" && Number.isFinite(marker.completedAt)) {
          completed.push({ directory, time: marker.completedAt });
          continue;
        }
      } catch {
        // Interrupted jobs have no valid completion marker.
      }
      let abandoned = false;
      try {
        const lease = JSON.parse(await readFile(path.join(directory, "active.json"), "utf8"));
        if (Number.isSafeInteger(lease?.pid) && lease.pid > 0 && Number.isFinite(lease.heartbeatAt)) {
          abandoned = !processExists(lease.pid) || lease.heartbeatAt < cutoff;
        } else {
          abandoned = (await stat(directory)).mtimeMs < cutoff;
        }
      } catch {
        // Legacy/unmarked folders get a grace period; freshly created live jobs are safe.
        abandoned = (await stat(directory)).mtimeMs < cutoff;
      }
      if (abandoned) await rm(directory, { recursive: true, force: true });
    }
    completed.sort((a, b) => b.time - a.time || a.directory.localeCompare(b.directory));
    for (const entry of completed.slice(keep)) await rm(entry.directory, { recursive: true, force: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT")
      console.warn("Could not apply media download retention:", error);
  }
}
