import { randomUUID } from "crypto";
import { existsSync, readdirSync, statSync, unlinkSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

const PREFIX = "qrcode-";
const STALE_MS = 5 * 60 * 1000;

type Kind = "shot" | "clip" | "poll";
type Ext = "png" | "ps1";

export function tempPath(kind: Kind, ext: Ext): string {
  return join(tmpdir(), `${PREFIX}${kind}-${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`);
}

export function safeUnlink(path: string): void {
  try {
    if (existsSync(path)) unlinkSync(path);
  } catch {
    /* ignore */
  }
}

export function cleanupStaleTempFiles(): void {
  try {
    const dir = tmpdir();
    const now = Date.now();
    for (const name of readdirSync(dir)) {
      if (!name.startsWith(PREFIX)) continue;
      const full = join(dir, name);
      try {
        if (now - statSync(full).mtimeMs > STALE_MS) unlinkSync(full);
      } catch {
        /* skip individual file */
      }
    }
  } catch {
    /* skip if tmpdir unreadable */
  }
}
