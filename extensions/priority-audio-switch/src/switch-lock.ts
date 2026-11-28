// One switch at a time per direction, across commands: Auto Switch (background), the open device list and Cycle run
// in separate processes. A lock file in the support folder, created with the exclusive "wx" flag, serializes them,
// so an automatic run can never finish after a manual choice and undo it.
import { environment } from "@raycast/api";
import fs from "fs";
import path from "path";
import type { IOType } from "./audio-device";

/** A lock older than this is left over from a process that ended without releasing it. */
const STALE_MS = 15_000;
/** How long a manual switch waits for a running automatic one before going ahead anyway. */
const MANUAL_WAIT_MS = 5_000;
const POLL_MS = 50;

const lockFile = (type: IOType) => path.join(environment.supportPath, `switch-${type}.lock`);

function tryAcquire(file: string): boolean {
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, String(process.pid), { flag: "wx" });
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
  }
  try {
    if (Date.now() - fs.statSync(file).mtimeMs > STALE_MS) {
      fs.rmSync(file, { force: true });
      fs.writeFileSync(file, String(process.pid), { flag: "wx" });
      return true;
    }
  } catch {
    // Another process released or took the lock meanwhile.
  }
  return false;
}

const release = (file: string) => fs.rmSync(file, { force: true });

/**
 * Automatic work: runs `fn` only when no other switch is in progress in this direction, and returns undefined when
 * one is (that run does the same work).
 */
export async function runIfFree<T>(type: IOType, fn: () => Promise<T>): Promise<T | undefined> {
  const file = lockFile(type);
  if (!tryAcquire(file)) return undefined;
  try {
    return await fn();
  } finally {
    release(file);
  }
}

/**
 * A manual switch (Select Device, Cycle): waits for a running automatic switch to finish, so the manual choice is
 * applied last. After MANUAL_WAIT_MS it goes ahead without the lock rather than fail the user's action.
 */
export async function runExclusive<T>(type: IOType, fn: () => Promise<T>): Promise<T> {
  const file = lockFile(type);
  const deadline = Date.now() + MANUAL_WAIT_MS;
  let locked = tryAcquire(file);
  while (!locked && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
    locked = tryAcquire(file);
  }
  try {
    return await fn();
  } finally {
    if (locked) release(file);
  }
}
