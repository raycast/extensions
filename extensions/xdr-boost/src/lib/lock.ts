// Cross-process lock for the intent transaction. Raycast runs each command, the menu bar tick and each AI tool
// in its own process, so an in-process queue would not serialize them. The three guards follow the plugin's
// learning `portable-node-advisory-file-lock`: an ownership token, a 1 s heartbeat, and an age re-check right
// before reclaiming a stale lock. Its documented residual applies: never corrupts, can drop an update only if
// a stalled holder and two reclaimers interleave, which needs a holder frozen for more than 10 s.
import { randomUUID } from "node:crypto";
import { mkdir, open, readFile, stat, unlink, utimes } from "node:fs/promises";
import { dirname } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

const STALE_MS = 10_000;
const RETRY_MS = 20;
const HEARTBEAT_MS = 1_000;
const WAIT_MS = 15_000;

function code(error: unknown): string | undefined {
  return error instanceof Error && "code" in error ? String((error as { code: unknown }).code) : undefined;
}

async function reclaimIfStale(path: string): Promise<void> {
  try {
    const [token, info] = await Promise.all([readFile(path, "utf8"), stat(path)]);
    if (Date.now() - info.mtimeMs <= STALE_MS) return;
    // Re-read right before the unlink: a successor may have taken the path since the first read.
    const [again, infoAgain] = await Promise.all([readFile(path, "utf8"), stat(path)]);
    if (again !== token || Date.now() - infoAgain.mtimeMs <= STALE_MS) return;
    await unlink(path);
  } catch {
    // Gone already, or unreadable for a moment: the next acquire attempt decides.
  }
}

export async function withFileLock<T>(path: string, fn: () => Promise<T>): Promise<T> {
  await mkdir(dirname(path), { recursive: true });
  const token = randomUUID();
  const deadline = performance.now() + WAIT_MS;
  for (;;) {
    try {
      const handle = await open(path, "wx"); // exclusive create: exactly one process wins
      await handle.writeFile(token);
      await handle.close();
      break;
    } catch (error) {
      if (code(error) !== "EEXIST") throw error;
      await reclaimIfStale(path);
      if (performance.now() > deadline)
        throw new Error("Another XDR Boost change is still running. Try again in a moment.");
      await sleep(RETRY_MS);
    }
  }
  const heartbeat = setInterval(() => {
    const now = new Date();
    utimes(path, now, now).catch(() => undefined);
  }, HEARTBEAT_MS);
  try {
    return await fn();
  } finally {
    clearInterval(heartbeat);
    try {
      if ((await readFile(path, "utf8")) === token) await unlink(path);
    } catch {
      // Already reclaimed: nothing of ours to remove.
    }
  }
}
