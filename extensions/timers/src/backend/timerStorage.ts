import { randomUUID } from "node:crypto";
import { renameSync, unlinkSync, writeFileSync } from "node:fs";
import { RawTimer } from "./types";

// Workers and UI commands read the same records. Publish complete JSON in one rename.
export function writeTimerFile(path: string, timer: RawTimer) {
  const temporaryPath = `${path}.${randomUUID()}.tmp`;
  try {
    writeFileSync(temporaryPath, JSON.stringify(timer));
    renameSync(temporaryPath, path);
  } finally {
    try {
      unlinkSync(temporaryPath);
    } catch {
      /* Best-effort cleanup must not mask a failed publish. */
    }
  }
}
