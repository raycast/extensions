import { mkdir, rmdir, stat } from "node:fs/promises";
import { join } from "node:path";

/** Runs fn while holding the lock, and returns what it returns. */
export type Lock = <T>(fn: () => Promise<T>) => Promise<T>;

/** For callers with nothing to guard against, such as tests of a single run. */
export const noLock: Lock = (fn) => fn();

export type LockOptions = { waitMs?: number; staleMs?: number; retryMs?: number };

/**
 * A lock shared by every run of the extension: LocalStorage has none, and the menu bar can run twice
 * at once (its timer and a menu open). mkdir either creates the directory or fails because it exists,
 * atomically, so only one run holds it. A lock older than staleMs was left by a run that died and is
 * taken over. If it cannot be taken within waitMs, fn runs anyway: a rare lost sample beats none.
 */
export function dirLock(dir: string, { waitMs = 2000, staleMs = 10_000, retryMs = 25 }: LockOptions = {}): Lock {
  const path = join(dir, "history.lock");
  return async (fn) => {
    const deadline = Date.now() + waitMs;
    let held = false;
    while (!held && Date.now() < deadline) {
      try {
        await mkdir(path);
        held = true;
      } catch {
        const age = await stat(path).then(
          (s) => Date.now() - s.mtimeMs,
          () => 0,
        );
        if (age > staleMs) await rmdir(path).catch(() => undefined);
        else await new Promise((r) => setTimeout(r, retryMs));
      }
    }
    try {
      return await fn();
    } finally {
      if (held) await rmdir(path).catch(() => undefined);
    }
  };
}
