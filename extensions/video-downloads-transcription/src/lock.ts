import {
  closeSync,
  constants,
  fstatSync,
  ftruncateSync,
  openSync,
  rmSync,
  statSync,
  writeSync,
} from "node:fs";
import { canceledError } from "./core";

/** macOS's `open(2)` flag for an exclusive lock; Node passes it through but doesn't name it. */
const O_EXLOCK = 0x20;

export type Lock = { release: () => void };

/**
 * Takes an exclusive lock on a file holding this process's ID, or returns
 * undefined while another process or another job holds it. macOS releases the
 * lock when the process exits, even after a crash, so a lock left behind never
 * blocks anyone and is never removed by mistake.
 */
export function tryLock(path: string): Lock | undefined {
  for (;;) {
    let fd: number;
    try {
      fd = openSync(
        path,
        constants.O_RDWR | constants.O_CREAT | constants.O_NONBLOCK | O_EXLOCK,
      );
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "EAGAIN") return undefined;
      throw error;
    }
    // The last holder removes the file before letting go, so a lock taken on
    // the removed file must be taken again on the new one.
    let current = false;
    try {
      current = statSync(path).ino === fstatSync(fd).ino;
    } catch {
      /* removed */
    }
    if (!current) {
      closeSync(fd);
      continue;
    }
    ftruncateSync(fd);
    writeSync(fd, String(process.pid));
    return {
      release() {
        rmSync(path, { force: true });
        closeSync(fd);
      },
    };
  }
}

/** Waits for a lock, checking twice a second, until it is free or `signal` aborts. */
export async function waitForLock(
  path: string,
  signal?: AbortSignal,
  onWait?: () => void,
): Promise<Lock> {
  for (let waiting = false; ; waiting = true) {
    if (signal?.aborted) throw canceledError();
    const lock = tryLock(path);
    if (lock) return lock;
    if (!waiting) onWait?.();
    await new Promise((done) => setTimeout(done, 500));
  }
}
