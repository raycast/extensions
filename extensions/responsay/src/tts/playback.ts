import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { writeFile, mkdir, copyFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir, homedir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";

const execFileP = promisify(execFile);
const CACHE_DIR = join(tmpdir(), "raycast-speaking-coach-audio");

export function audioCacheKey(parts: {
  text: string;
  provider: string;
  model?: string;
  voice: string;
  rate: number;
}): string {
  return createHash("sha1")
    .update(JSON.stringify(parts))
    .digest("hex")
    .slice(0, 16);
}

export function cachedAudioPath(key: string, ext: string): string | null {
  const p = join(CACHE_DIR, `${key}.${ext}`);
  return existsSync(p) ? p : null;
}

export async function writeAudioCache(
  key: string,
  ext: string,
  bytes: Buffer,
): Promise<string> {
  if (!existsSync(CACHE_DIR)) await mkdir(CACHE_DIR, { recursive: true });
  const p = join(CACHE_DIR, `${key}.${ext}`);
  await writeFile(p, bytes);
  return p;
}

export async function playAudio(
  path: string,
  exec: typeof execFileP = execFileP,
): Promise<void> {
  await exec("afplay", [path]);
}

/** Play the file `times` times with a gap between repeats — for shadowing practice. */
export async function loopPlay(
  path: string,
  times: number,
  gapMs: number,
  exec: typeof execFileP = execFileP,
): Promise<void> {
  const n = Math.max(1, Math.floor(times));
  for (let i = 0; i < n; i++) {
    await playAudio(path, exec);
    if (i < n - 1 && gapMs > 0)
      await new Promise((resolve) => setTimeout(resolve, gapMs));
  }
}

/** Copy a cached audio file into ~/Downloads; returns the destination path. */
export async function exportToDownloads(
  path: string,
  filename: string,
): Promise<string> {
  const dest = join(homedir(), "Downloads", filename);
  await copyFile(path, dest);
  return dest;
}
