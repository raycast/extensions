import { createWriteStream } from "fs";
import { mkdir, open, unlink } from "fs/promises";
import { homedir } from "os";
import { basename, extname, join } from "path";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import type { ReadableStream as WebReadableStream } from "stream/web";
import { isWsError, withToken } from "./moodle";
import { AuthError, clearStoredToken, getToken, SESSION_EXPIRED_MESSAGE } from "./auth";

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

/** Candidate local names for a download: `name.ext`, `name (1).ext`, `name (2).ext`, … */
export function candidatePaths(dir: string, filename: string): Iterable<string> {
  const safe = sanitizeFilename(filename);
  const ext = extname(safe);
  const stem = basename(safe, ext);
  return {
    *[Symbol.iterator]() {
      yield join(dir, safe);
      for (let counter = 1; ; counter += 1) yield join(dir, `${stem} (${counter})${ext}`);
    },
  };
}

/**
 * Atomically reserves a free filename in `dir` using exclusive creation (`wx`), retrying with a numeric
 * suffix on `EEXIST`, so two concurrent downloads of the same file never share a path.
 */
export async function reserveUniquePath(dir: string, filename: string): Promise<string> {
  for (const candidate of candidatePaths(dir, filename)) {
    try {
      const handle = await open(candidate, "wx");
      await handle.close();
      return candidate;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    }
  }
  throw new Error("Could not reserve a filename");
}

async function throwDownloadError(response: Response): Promise<never> {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body: unknown = await response.json().catch(() => undefined);
    const errorcode =
      isWsError(body) || (typeof body === "object" && body !== null && "errorcode" in body)
        ? String((body as { errorcode?: unknown }).errorcode ?? "")
        : "";
    if (errorcode === "invalidtoken" || errorcode === "accessexception") {
      await clearStoredToken();
      throw new AuthError(`WeBeep rejected the access token. ${SESSION_EXPIRED_MESSAGE}`);
    }
    const message = typeof body === "object" && body !== null ? (body as { error?: string; message?: string }) : {};
    throw new Error(`WeBeep refused the download: ${message.message ?? message.error ?? errorcode ?? "unknown error"}`);
  }
  if (response.status === 401 || response.status === 403) {
    await clearStoredToken();
    throw new AuthError(`WeBeep rejected the access token. ${SESSION_EXPIRED_MESSAGE}`);
  }
  throw new Error(`Download failed with HTTP ${response.status}`);
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
  const token = await getToken();
  const response = await fetchImpl(withToken(downloadUrl, token));
  const contentType = response.headers.get("content-type") ?? "";
  if (!response.ok || !response.body || contentType.includes("application/json")) {
    await throwDownloadError(response);
  }
  const target = await reserveUniquePath(dir, filename);
  try {
    await pipeline(Readable.fromWeb(response.body as WebReadableStream), createWriteStream(target));
  } catch (error) {
    await unlink(target).catch(() => undefined);
    throw error;
  }
  return target;
}
