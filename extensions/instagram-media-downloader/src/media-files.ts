import { open, rm } from "node:fs/promises";
import type { FileHandle } from "node:fs/promises";

/** Deliberately free of `@raycast/api` so it stays unit-testable outside Raycast. */

/**
 * The extension has to come from what the server sent when it says, because the URL can lie.
 * When it doesn't say — d.rapidcdn.app serves everything as `application/octet-stream` — the
 * filename inside the downloader's token is the next best evidence (see `extensionFor`).
 */
const EXTENSION_BY_CONTENT_TYPE: Record<string, string> = {
  "image/webp": "webp",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/heic": "heic",
  "image/avif": "avif",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
};

/** Bound the collision search so a pathological folder can't spin forever. */
const MAX_FILENAME_ATTEMPTS = 100;

function mimeOf(contentType: string | null): string {
  return contentType?.split(";")[0].trim().toLowerCase() ?? "";
}

function getExtension(value?: string): string | undefined {
  const match = value?.match(/\.([a-z0-9]{2,5})(?:[/?#]|$)/i);
  return match?.[1].toLowerCase().replace("jpeg", "jpg");
}

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return Buffer.from(padded, "base64").toString("utf8");
}

function getFileNameFromUrl(url: string): string | undefined {
  try {
    const parsedUrl = new URL(url);
    const token = parsedUrl.searchParams.get("token");

    if (token) {
      const payload = JSON.parse(decodeBase64Url(token.split(".")[1] || "")) as {
        filename?: string;
        url?: string;
      };

      if (payload.filename) return payload.filename;

      if (payload.url) {
        const sourceFileName = getFileNameFromUrl(payload.url);
        if (sourceFileName) return sourceFileName;
      }
    }

    const pathFileName = parsedUrl.pathname.split("/").filter(Boolean).pop();
    return pathFileName ? decodeURIComponent(pathFileName) : undefined;
  } catch {
    return undefined;
  }
}

export function mediaExtensionAndId(url: string): { ext: string; fileId: string | undefined } {
  const fileName = getFileNameFromUrl(url);
  const ext = getExtension(fileName) || getExtension(url) || "mp4";
  const fileId = fileName?.replace(/\.[^.]+$/, "") || url.split(/[/?#]/).filter(Boolean).pop();
  return { ext, fileId };
}

/**
 * The downloader API repeats a carousel's items — a 4-image post came back as 16 entries, the
 * set four times over — and each repeat is a fresh signed wrapper, so the URL is not an
 * identity. The filename in the token is: it carries Instagram's media id.
 */
export function uniqueMediaUrls(urls: string[]): string[] {
  const seen = new Set<string>();
  return urls.filter((url) => {
    const key = getFileNameFromUrl(url) ?? url;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function countOf(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

/** `<shortcode>` for a single item, `<shortcode>-<n>` (from 1) for each item of a carousel. */
export function mediaBasename(shortcode: string, index: number, count: number): string {
  return count === 1 ? shortcode : `${shortcode}-${index + 1}`;
}

/**
 * The downloader's signed URLs carry the signed Instagram URL inside their token, and Instagram's
 * own carry `oh`/`oe` signatures. Logs and the Copy Error payload get pasted into bug reports,
 * so they get the path only.
 */
export function redactUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return "(unparseable url)";
  }
}

/**
 * A signed URL that has expired can still answer `200` — with an HTML or JSON error page.
 * Writing that to disk as `.jpg` and reporting success is worse than failing. The downloader's
 * CDN declares no media type at all (`application/octet-stream`), so that is accepted too.
 */
export function assertMediaResponse(contentType: string | null): void {
  const mime = mimeOf(contentType);
  const isMedia = mime.startsWith("image/") || mime.startsWith("video/") || mime.startsWith("audio/");
  if (!isMedia && mime !== "application/octet-stream") {
    throw new Error(`Expected an image or video file, but the server sent ${mime || "an unknown type"}.`);
  }
}

export function extensionFor(contentType: string | null, url: string): string {
  return EXTENSION_BY_CONTENT_TYPE[mimeOf(contentType)] ?? mediaExtensionAndId(url).ext;
}

type Reservation = {
  /** Open handle on the `.part` file the content is streamed into. */
  handle: FileHandle;
  /** Final destination, claimed as an empty placeholder until the rename. */
  filePath: string;
  partPath: string;
};

/**
 * Claim a free destination by creating BOTH the final path and its `.part` sibling with `wx`,
 * then stream into the `.part` and rename over our own placeholder. Claiming the final path is
 * the point: `rename()` would otherwise silently overwrite an earlier download of that name.
 */
export async function reservePath(folder: string, name: string, extension: string): Promise<Reservation> {
  for (let counter = 0; counter < MAX_FILENAME_ATTEMPTS; counter++) {
    const suffix = counter === 0 ? "" : ` (${counter})`;
    const filePath = `${folder}/${name}${suffix}.${extension}`;
    const partPath = `${filePath}.part`;

    let claimed = false;
    try {
      const placeholder = await open(filePath, "wx");
      // Mark it claimed BEFORE awaiting close, so a rejecting close() still gets cleaned up.
      claimed = true;
      await placeholder.close();
      return { handle: await open(partPath, "wx"), filePath, partPath };
    } catch (error) {
      if (claimed) await rm(filePath, { force: true }).catch(() => {});
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    }
  }

  throw new Error(`Couldn't find a free filename for ${name}.${extension} in ${folder}.`);
}

/** Drop a reservation whose content never arrived, leaving no empty placeholder behind. */
export async function releaseReservation(filePath: string, partPath: string): Promise<void> {
  await rm(partPath, { force: true }).catch(() => {});
  await rm(filePath, { force: true }).catch(() => {});
}
