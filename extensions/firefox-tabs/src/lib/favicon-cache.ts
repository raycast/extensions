import { environment } from "@raycast/api";
import { createHash } from "crypto";
import { existsSync, mkdirSync, readdirSync, renameSync, statSync, unlinkSync, utimesSync, writeFileSync } from "fs";
import { join } from "path";

const CACHE_DIR = join(environment.supportPath, "favicons");

/** Files not used for this long are deleted on the next launch. */
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

const MIME_EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  "image/x-icon": "ico",
  "image/vnd.microsoft.icon": "ico",
};

const pathsByUri = new Map<string, string | null>();
let pruned = false;

/**
 * Delete cached favicons whose mtime is older than MAX_AGE_MS. faviconPath
 * bumps the mtime of every file it serves, so only unused icons expire.
 */
function pruneCache() {
  pruned = true;
  const cutoff = Date.now() - MAX_AGE_MS;
  try {
    for (const name of readdirSync(CACHE_DIR)) {
      const file = join(CACHE_DIR, name);
      try {
        if (statSync(file).mtimeMs < cutoff) unlinkSync(file);
      } catch {
        // File vanished or is locked: leave it for the next launch
      }
    }
  } catch {
    // Cache directory doesn't exist yet
  }
}

/**
 * Decode a data URI into its mime type and bytes. Parameters other than
 * `base64` (e.g. `charset=utf-8`) are ignored. Percent-escapes are decoded
 * byte by byte so a stray `%` or non-UTF-8 escape doesn't throw.
 */
function decodeDataUri(dataUri: string): { mime: string; bytes: Buffer } | null {
  const comma = dataUri.indexOf(",");
  if (!dataUri.startsWith("data:") || comma < 0) return null;
  const [mime, ...params] = dataUri.slice(5, comma).split(";");
  const payload = dataUri.slice(comma + 1);
  const isBase64 = params.some((p) => p.trim().toLowerCase() === "base64");

  let bytes: Buffer;
  if (isBase64) {
    bytes = Buffer.from(payload, "base64");
  } else {
    const parts: Buffer[] = [];
    let last = 0;
    for (const m of payload.matchAll(/%([0-9a-fA-F]{2})/g)) {
      parts.push(Buffer.from(payload.slice(last, m.index), "utf8"));
      parts.push(Buffer.from([parseInt(m[1], 16)]));
      last = m.index + m[0].length;
    }
    parts.push(Buffer.from(payload.slice(last), "utf8"));
    bytes = Buffer.concat(parts);
  }
  return bytes.length > 0 ? { mime: mime.trim().toLowerCase(), bytes } : null;
}

/**
 * Write a favicon data URI to a content-addressed file and return its path.
 *
 * Raycast serializes the whole List on every render, so inline data URIs
 * (some favicons are 40KB+) make typing lag with many tabs. File paths keep
 * the payload small. Returns null if the URI can't be decoded or written.
 */
export function faviconPath(dataUri: string): string | null {
  const cached = pathsByUri.get(dataUri);
  if (cached !== undefined) return cached;
  if (!pruned) pruneCache();

  let path: string | null = null;
  const decoded = decodeDataUri(dataUri);
  if (decoded) {
    const ext = MIME_EXTENSIONS[decoded.mime] ?? "png";
    const hash = createHash("sha1").update(dataUri).digest("hex");
    const target = join(CACHE_DIR, `${hash}.${ext}`);
    try {
      if (existsSync(target)) {
        const now = new Date();
        utimesSync(target, now, now);
      } else {
        // Write then rename so a concurrent reader or a killed process
        // never leaves a truncated file at the final path.
        mkdirSync(CACHE_DIR, { recursive: true });
        const tmp = `${target}.${process.pid}.tmp`;
        writeFileSync(tmp, decoded.bytes);
        renameSync(tmp, target);
      }
      path = target;
    } catch {
      // Unwritable support dir: caller falls back to the inline URI
    }
  }

  pathsByUri.set(dataUri, path);
  return path;
}
