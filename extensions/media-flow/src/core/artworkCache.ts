import { createHash } from "node:crypto";
import { existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const TTL_MS = 60 * 60 * 1000;
let cacheDir: string | undefined;

export function setArtworkCacheDir(dir: string): void {
  cacheDir = dir;
}

function resolveDir(): string {
  if (cacheDir) return cacheDir;
  // Lazy so unit tests never touch the Raycast runtime.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { environment } = require("@raycast/api") as {
    environment: { supportPath: string };
  };
  cacheDir = join(environment.supportPath, "artwork");
  return cacheDir;
}

/** Persist base64 artwork; returns local file path or null. Fresh files (<1h) are reused. */
export async function cacheArtwork(
  key: string,
  base64: string,
  mime?: string,
): Promise<string | null> {
  try {
    const dir = resolveDir();
    mkdirSync(dir, { recursive: true });
    const ext = mime === "image/png" ? "png" : "jpg";
    const file = join(
      dir,
      `${createHash("sha1").update(key).digest("hex")}.${ext}`,
    );
    if (existsSync(file) && Date.now() - statSync(file).mtimeMs < TTL_MS)
      return file;
    writeFileSync(file, Buffer.from(base64, "base64"));
    return file;
  } catch {
    return null;
  }
}
