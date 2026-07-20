import { existsSync, readFileSync, unlinkSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

const SESSION_LOCK_FILE = join(tmpdir(), "gemini-tts.session.lock");

/**
 * Reading sessions own a session lock for their entire lifetime
 * (synthesis + playback), not just the afplay process. Without it
 * there's a 1-2 second race window between "synthesis started" and
 * "first afplay launched" during which the PID-file machinery sees no
 * active player and a second Quick Read trigger would launch a parallel
 * reading instead of toggle-stopping.
 *
 * The lock stores the Node process PID of the running command. A stale
 * lock (PID gone) is treated as no lock — Raycast commands die quickly
 * after their async work completes, so a leftover lock from a crashed
 * command is cleared on the next acquire attempt.
 */
export function acquireSessionLock(): boolean {
  if (hasActiveSession()) return false;
  try {
    writeFileSync(SESSION_LOCK_FILE, String(process.pid), "utf8");
    return true;
  } catch {
    return false;
  }
}

export function releaseSessionLock(): void {
  try {
    if (!existsSync(SESSION_LOCK_FILE)) return;
    const pid = readSessionLockPid();
    if (pid === null || pid === process.pid) {
      unlinkSync(SESSION_LOCK_FILE);
    }
  } catch {
    // ignore
  }
}

/**
 * True if another running command holds the session lock. Cleans up
 * stale locks (dead PID) as a side effect so the next acquire can
 * succeed.
 */
export function hasActiveSession(): boolean {
  if (!existsSync(SESSION_LOCK_FILE)) return false;
  const pid = readSessionLockPid();
  if (pid === null) {
    safeRemove();
    return false;
  }
  if (!isAlive(pid)) {
    safeRemove();
    return false;
  }
  return true;
}

export async function waitForSessionLockRelease(timeoutMs = 1500, intervalMs = 50): Promise<boolean> {
  const startedAt = Date.now();
  while (hasActiveSession()) {
    if (Date.now() - startedAt >= timeoutMs) {
      return false;
    }
    await delay(intervalMs);
  }
  return true;
}

function readSessionLockPid(): number | null {
  try {
    const raw = readFileSync(SESSION_LOCK_FILE, "utf8").trim();
    const pid = parseInt(raw, 10);
    return Number.isFinite(pid) && pid > 0 ? pid : null;
  } catch {
    return null;
  }
}

function isAlive(pid: number): boolean {
  try {
    // signal 0 doesn't deliver a signal but throws if the process is gone.
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function safeRemove(): void {
  try {
    if (existsSync(SESSION_LOCK_FILE)) unlinkSync(SESSION_LOCK_FILE);
  } catch {
    // ignore
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
