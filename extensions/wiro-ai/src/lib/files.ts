import { randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import { open, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";
import { USER_AGENT } from "./wiro";

/**
 * Picks a free name in the folder and creates the file, empty, in the same step. Two saves that
 * start together, such as two outputs named `0.png`, never get the same file.
 */
export async function reservePath(folder: string, name: string): Promise<string> {
  const extension = extname(name);
  const stem = name.slice(0, name.length - extension.length);
  for (let index = 1; ; index += 1) {
    const candidate = join(folder, index === 1 ? name : `${stem}-${index}${extension}`);
    try {
      await (await open(candidate, "wx")).close();
      return candidate;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    }
  }
}

const MAX_DOWNLOADS = 2;
let activeDownloads = 0;
const waitingDownloads: Array<() => void> = [];

async function acquireDownload(): Promise<void> {
  if (activeDownloads < MAX_DOWNLOADS) {
    activeDownloads += 1;
    return;
  }
  // The slot is handed over by releaseDownload, so the count stays the same.
  await new Promise<void>((resolve) => waitingDownloads.push(resolve));
}

function releaseDownload(): void {
  const next = waitingDownloads.shift();
  if (next) next();
  else activeDownloads -= 1;
}

/**
 * Streams a file to disk, two downloads at a time, so large videos never sit in memory. It
 * writes to a temporary file of its own and renames it into place at the end, so a half-written
 * file never looks finished and two downloads never share a temporary file.
 */
export async function download(url: string, path: string): Promise<void> {
  await acquireDownload();
  const partial = `${path}.${randomUUID().slice(0, 8)}.part`;
  try {
    const response = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    if (!response.ok) throw new Error(`The download failed (HTTP ${response.status}).`);
    if (response.body) {
      await pipeline(
        Readable.fromWeb(response.body as unknown as NodeReadableStream<Uint8Array>),
        createWriteStream(partial),
      );
    } else {
      await writeFile(partial, "");
    }
    await rename(partial, path);
  } catch (error) {
    await rm(partial, { force: true });
    throw error;
  } finally {
    releaseDownload();
  }
}

/** Cached outputs are kept for three days after their folder last changed. */
export const CACHE_MAX_AGE_MS = 3 * 24 * 60 * 60 * 1000;

/** Removes the folders under `root` that have not changed for `maxAgeMs`. */
export async function pruneFolders(root: string, maxAgeMs: number, now = Date.now()): Promise<string[]> {
  const removed: string[] = [];
  let entries;
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch {
    return removed; // Nothing cached yet.
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const folder = join(root, entry.name);
    try {
      if (now - (await stat(folder)).mtimeMs > maxAgeMs) {
        await rm(folder, { recursive: true, force: true });
        removed.push(entry.name);
      }
    } catch {
      // The folder went away meanwhile.
    }
  }
  return removed;
}
