import { readdirSync, statSync, unlinkSync } from "node:fs";
import path from "node:path";

/** Generated card images unused for this long are deleted; any still needed are regenerated on demand. */
export const CARD_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/** Deletes files in `directory` last used (modified) more than `maxAgeMs` ago. Returns how many were removed. */
export function pruneStaleFiles(directory: string, maxAgeMs: number, now = Date.now()): number {
  let removed = 0;
  for (const name of readdirSync(directory)) {
    const file = path.join(directory, name);
    try {
      const stats = statSync(file);
      if (stats.isFile() && now - stats.mtimeMs > maxAgeMs) {
        unlinkSync(file);
        removed++;
      }
    } catch {
      // Another command may have removed or replaced the file meanwhile.
    }
  }
  return removed;
}
