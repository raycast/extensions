import fs from "node:fs/promises";
import path from "node:path";
import { OWNER_ID, tryAcquireLock } from "./liveness";

export interface SourcePreparationLease {
  waited: boolean;
  release(): Promise<void>;
}

const tails = new Map<string, Promise<void>>();

/** A source is locked only while preparing/publishing a reusable fragment, never rendering. */
export async function acquireSourceLease(supportPath: string, key: string): Promise<SourcePreparationLease> {
  if (!/^[a-f0-9]{64}$/.test(key)) throw new Error("Invalid source preparation key.");
  const root = path.join(supportPath, "source-leases-v1");
  const lock = path.join(root, key);
  const previous = tails.get(lock);
  let unlock!: () => void;
  const tail = new Promise<void>((resolve) => {
    unlock = resolve;
  });
  tails.set(lock, tail);
  let waited = Boolean(previous);
  let releaseLock: (() => void) | undefined;
  const finish = () => {
    if (tails.get(lock) === tail) tails.delete(lock);
    unlock();
  };
  try {
    await previous;
    await fs.mkdir(root, { recursive: true, mode: 0o700 });
    const deadline = Date.now() + 240_000;
    while (!releaseLock) {
      // Commands share one host process, so ownership is tracked per command heartbeat.
      releaseLock = tryAcquireLock(supportPath, lock);
      if (!releaseLock) {
        waited = true;
        if (Date.now() >= deadline)
          throw new Error(
            "Timed out waiting for another segment of the same video to finish preparing. Try again later.",
          );
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
  } catch (error) {
    finish();
    throw error;
  }
  let releasing: Promise<void> | undefined;
  return {
    waited,
    release: () =>
      (releasing ??= (async () => {
        try {
          // Never remove another command's ownership record.
          const owner = (await fs.readFile(lock, "utf8")).trim();
          if (owner === OWNER_ID) releaseLock?.();
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
        } finally {
          finish();
        }
      })()),
  };
}
