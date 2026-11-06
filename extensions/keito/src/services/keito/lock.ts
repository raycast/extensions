// A lock shared by every Raycast command of this extension. Commands run in separate processes, so
// in-memory locks can't coordinate them; creating a directory is atomic on the filesystem.
import { randomBytes } from "crypto";
import { mkdir, readFile, rm, stat, writeFile } from "fs/promises";
import { dirname, join } from "path";
import { KeitoError } from "./errors";

export type Lock = <T>(fn: () => Promise<T>) => Promise<T>;

export interface FileLockOptions {
  /** A lock older than this is treated as left behind by a crashed command. */
  staleMs?: number;
  /** Give up waiting after this long. */
  timeoutMs?: number;
  pollMs?: number;
}

export function fileLock(path: string, options: FileLockOptions = {}): Lock {
  const staleMs = options.staleMs ?? 30_000;
  const timeoutMs = options.timeoutMs ?? staleMs + 5_000;
  const pollMs = options.pollMs ?? 100;
  const ownerFile = join(path, "owner");

  return async <T>(fn: () => Promise<T>): Promise<T> => {
    const owner = randomBytes(8).toString("hex");
    const deadline = Date.now() + timeoutMs;
    for (;;) {
      try {
        await mkdir(path);
        await writeFile(ownerFile, owner);
        break;
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        if (code === "ENOENT") {
          // The support folder doesn't exist yet.
          await mkdir(dirname(path), { recursive: true });
          continue;
        }
        if (code !== "EEXIST") throw error;
        const age = await stat(path).then(
          (s) => Date.now() - s.mtimeMs,
          () => 0,
        );
        if (age > staleMs) {
          await rm(path, { recursive: true, force: true });
          continue;
        }
        if (Date.now() > deadline) {
          throw new KeitoError("timeout", "Another Keito command is still renewing your sign-in. Try again shortly.");
        }
        await new Promise((resolve) => setTimeout(resolve, pollMs));
      }
    }
    try {
      return await fn();
    } finally {
      // Release only our own lock, in case it was declared stale and taken over meanwhile.
      const current = await readFile(ownerFile, "utf8").catch(() => undefined);
      if (current === owner) await rm(path, { recursive: true, force: true });
    }
  };
}
