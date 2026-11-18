import { mkdirSync, rmdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { environment } from "@raycast/api";

/** Serialize timer mutations and storage updates across independent commands. */
export async function withOperationLock<T>(
  connectionId: string,
  action: () => Promise<T>,
): Promise<T> {
  mkdirSync(environment.supportPath, { recursive: true });
  const path = join(environment.supportPath, `timer-operation-${connectionId}.lock`);
  const deadline = Date.now() + 2000;
  while (true) {
    try {
      mkdirSync(path);
      break;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      try {
        // API requests have a 15-second deadline. Allow a full minute before
        // recovering a reservation left by an unloaded or killed command.
        if (Date.now() - statSync(path).mtimeMs > 60_000) {
          rmdirSync(path);
          continue;
        }
      } catch (failure) {
        if ((failure as NodeJS.ErrnoException).code === "ENOENT") continue;
        throw failure;
      }
      if (Date.now() >= deadline)
        throw new Error("A timer request is still running. Try your new choice again shortly.");
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  }
  try {
    return await action();
  } finally {
    rmdirSync(path);
  }
}
