import { access, mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join, parse } from "node:path";
import { imageSize, ImageSize } from "./image-size";
import { IconFile } from "./types";

const DOWNLOAD_TIMEOUT_MS = 30_000;

async function fetchOk(url: string): Promise<Response> {
  const response = await fetch(url, { signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS) });
  if (!response.ok) throw new Error(`Download failed (${response.status} ${response.statusText})`);
  return response;
}

export async function downloadBytes(url: string): Promise<Buffer> {
  return Buffer.from(await (await fetchOk(url)).arrayBuffer());
}

export async function downloadText(url: string): Promise<string> {
  return (await fetchOk(url)).text();
}

/** Intrinsic size of a remote PNG, WebP or SVG, or undefined when it cannot be read. */
export async function fetchImageSize(url: string): Promise<ImageSize | undefined> {
  return imageSize(new Uint8Array(await downloadBytes(url)));
}

export function expandHome(path: string): string {
  return path === "~" || path.startsWith("~/") ? join(homedir(), path.slice(1)) : path;
}

export function defaultDownloadDirectory(): string {
  return join(homedir(), "Downloads");
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/** First free path for fileName in directory: "ntfy.webp", then "ntfy-1.webp", "ntfy-2.webp", ... */
export async function uniquePath(directory: string, fileName: string): Promise<string> {
  const { name, ext } = parse(fileName);
  let candidate = join(directory, fileName);
  for (let index = 1; await exists(candidate); index++) {
    candidate = join(directory, `${name}-${index}${ext}`);
  }
  return candidate;
}

/**
 * Downloads the file into a per-icon folder below cacheDirectory and returns its path.
 * The original file name is kept so pasting into Finder or a chat yields e.g. "ntfy.webp".
 */
export async function downloadToCache(file: IconFile, cacheDirectory: string): Promise<string> {
  const directory = join(cacheDirectory, "clipboard", file.format, file.variant);
  await mkdir(directory, { recursive: true });
  const path = join(directory, file.fileName);
  await writeFile(path, await downloadBytes(file.url));
  return path;
}

/** Downloads the file into directory without overwriting existing files and returns the saved path. */
export async function saveToDirectory(file: IconFile, directory: string): Promise<string> {
  const target = expandHome(directory);
  await mkdir(target, { recursive: true });
  const bytes = await downloadBytes(file.url);
  const path = await uniquePath(target, file.fileName);
  await writeFile(path, bytes, { flag: "wx" });
  return path;
}
