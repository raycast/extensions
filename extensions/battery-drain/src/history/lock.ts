import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";

/** Runs fn while holding the lock, and returns what it returns. */
export type Lock = <T>(fn: () => Promise<T>) => Promise<T>;

/** For callers with nothing to guard against, such as tests of a single run. */
export const noLock: Lock = (fn) => fn();

export type LockOptions = { waitMs?: number; staleMs?: number; retryMs?: number };

function code(e: unknown): string | undefined {
  return typeof e === "object" && e !== null && "code" in e ? String((e as { code: unknown }).code) : undefined;
}

const readOwner = (path: string) => readFile(join(path, "owner"), "utf8").catch(() => undefined);

/**
 * A lock shared by every run of the extension: LocalStorage has none, and the menu bar can run twice
 * at once (its timer and a menu open). mkdir either creates the directory or fails because it exists,
 * atomically, so only one run holds it; the holder writes a token inside, and releases only a lock that
 * still carries its token. A lock older than staleMs was left by a run that died (or slept) and is taken
 * over with rename, which only one run can win. If the lock cannot be taken within waitMs, or the folder
 * cannot hold one, fn runs anyway: a rare lost sample beats none.
 */
export function dirLock(dir: string, { waitMs = 2000, staleMs = 10_000, retryMs = 25 }: LockOptions = {}): Lock {
  const path = join(dir, "history.lock");
  return async (fn) => {
    const token = randomUUID();
    const deadline = Date.now() + waitMs;
    let held = false;
    // Raycast may not have created the support folder yet on a first run.
    await mkdir(dir, { recursive: true }).catch(() => undefined);
    while (!held && Date.now() < deadline) {
      try {
        await mkdir(path);
        await writeFile(join(path, "owner"), token);
        held = true;
      } catch (e) {
        if (code(e) !== "EEXIST") break; // this folder cannot hold a lock: run without one
        const age = await stat(path).then(
          (s) => Date.now() - s.mtimeMs,
          () => 0,
        );
        if (age > staleMs) await takeOver(path, token, staleMs);
        else await new Promise((r) => setTimeout(r, retryMs));
      }
    }
    try {
      return await fn();
    } finally {
      if (held && (await readOwner(path)) === token) await rm(path, { recursive: true, force: true });
    }
  };
}

/**
 * Moves a stale lock aside, atomically. If another run took it over between our look and our move, what
 * we moved is its fresh lock: that is put back, and we keep waiting.
 */
async function takeOver(path: string, token: string, staleMs: number): Promise<void> {
  const aside = `${path}.stale-${token}`;
  try {
    await rename(path, aside);
  } catch {
    return; // someone else moved it first
  }
  const age = await stat(aside).then(
    (s) => Date.now() - s.mtimeMs,
    () => Infinity,
  );
  if (age <= staleMs) {
    await rename(aside, path).catch(() => undefined);
    return;
  }
  await rm(aside, { recursive: true, force: true });
}
