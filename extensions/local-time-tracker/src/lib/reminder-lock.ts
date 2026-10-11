import { mkdir, rmdir, stat } from "node:fs/promises";

// A directory lock also serializes separate Raycast command processes. A stale
// lock can remain if Raycast terminates a command; recover it on a later check.
export async function withReminderLock<T>(path: string, action: () => Promise<T>): Promise<T> {
  try {
    await mkdir(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    if (Date.now() - (await stat(path)).mtimeMs < 5 * 60000) {
      throw new Error("Another reminder operation is running. Try again shortly.");
    }
    await rmdir(path);
    await mkdir(path);
  }
  try {
    return await action();
  } finally {
    await rmdir(path);
  }
}
