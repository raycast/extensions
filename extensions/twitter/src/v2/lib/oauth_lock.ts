import { environment } from "@raycast/api";
import { mkdir, rmdir } from "node:fs/promises";
import { join } from "node:path";
import { setTimeout } from "node:timers/promises";

// Never steal a lock based on its age: a paused process could still write rotated
// credentials. A crashed holder deliberately fails closed instead of risking them.
export async function withOAuthLock<T>(operation: () => Promise<T>): Promise<T> {
  await mkdir(environment.supportPath, { recursive: true });
  const lockPath = join(environment.supportPath, "oauth-credentials.lock");
  const deadline = Date.now() + 15_000;
  while (true) {
    try {
      await mkdir(lockPath);
      break;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      if (Date.now() >= deadline) {
        throw new Error(
          `Another X command is updating authentication. Retry shortly. If it crashed, close all X extension commands before removing ${lockPath}.`,
        );
      }
      await setTimeout(100);
    }
  }
  try {
    return await operation();
  } finally {
    await rmdir(lockPath);
  }
}
