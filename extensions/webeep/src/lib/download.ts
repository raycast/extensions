import { createWriteStream } from "fs";
import { access, mkdir } from "fs/promises";
import { homedir } from "os";
import { basename, extname, join } from "path";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import type { ReadableStream as WebReadableStream } from "stream/web";
import { withToken } from "./moodle";
import { getToken } from "./auth";

export function expandHome(path: string): string {
  if (path === "~") return homedir();
  if (path.startsWith("~/")) return join(homedir(), path.slice(2));
  return path;
}

/** Strips path separators and control characters so a remote filename is safe to write locally. */
export function sanitizeFilename(name: string): string {
  const cleaned = name.replace(/[/\\:]|\p{Cc}/gu, "_").trim();
  return cleaned || "download";
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/** Returns `dir/name`, or `dir/name (n).ext` when the file already exists. */
export async function uniquePath(
  dir: string,
  filename: string,
  fileExists: (path: string) => Promise<boolean> = exists,
): Promise<string> {
  const safe = sanitizeFilename(filename);
  const ext = extname(safe);
  const stem = basename(safe, ext);
  let candidate = join(dir, safe);
  let counter = 1;
  while (await fileExists(candidate)) {
    candidate = join(dir, `${stem} (${counter})${ext}`);
    counter += 1;
  }
  return candidate;
}

/** Downloads a course file into the given directory and returns the local path. */
export async function downloadFile(
  downloadUrl: string,
  filename: string,
  directory: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  const dir = expandHome(directory);
  await mkdir(dir, { recursive: true });
  const target = await uniquePath(dir, filename);
  const token = await getToken();
  const response = await fetchImpl(withToken(downloadUrl, token));
  if (!response.ok || !response.body) throw new Error(`Download failed with HTTP ${response.status}`);
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const text = await response.text();
    throw new Error(`WeBeep refused the download: ${text.slice(0, 200)}`);
  }
  await pipeline(Readable.fromWeb(response.body as WebReadableStream), createWriteStream(target));
  return target;
}
