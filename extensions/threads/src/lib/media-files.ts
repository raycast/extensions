import { execFile } from "node:child_process";
import type { MediaKind } from "./threads-post";
import { open, rename, rm, stat } from "node:fs/promises";
import type { FileHandle } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { promisify } from "node:util";

/**
 * The extension has to come from what the server actually sent, because the URL lies and the
 * format varies per post: a `.jpg` URL is served as `image/webp` on some posts and
 * `image/jpeg` on others (both observed 2026-09-09). Trusting the URL lands WebP bytes in a
 * `.jpg` file, which several macOS apps refuse to open — which is also why this map stays
 * broad rather than being trimmed to the formats seen so far.
 */
const EXTENSION_BY_CONTENT_TYPE: Record<string, string> = {
  "image/webp": "webp",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/heic": "heic",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
  "image/avif": "avif",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  // Raw AAC is an ADTS stream, not an MP4 container — naming it .m4a mislabels the bytes.
  "audio/aac": "aac",
  "audio/ogg": "ogg",
  "audio/webm": "weba",
  "audio/flac": "flac",
  "audio/wav": "wav",
};

/** Used when the response's content type isn't one we recognise. */
const FALLBACK_EXTENSION: Record<MediaKind, string> = { image: "jpg", video: "mp4", audio: "m4a" };

/** Image formats the user can ask for, mapped to the extension and `sips` format name. */
const IMAGE_FORMATS: Record<string, { extension: string; sipsFormat: string }> = {
  jpeg: { extension: "jpg", sipsFormat: "jpeg" },
  png: { extension: "png", sipsFormat: "png" },
};

/** Bound the collision search so a pathological folder can't spin forever. */
const MAX_FILENAME_ATTEMPTS = 100;

/** `sips` is normally instant; this only fires if it wedges on a malformed image. */
const CONVERT_TIMEOUT_MS = 60_000;

const execFileAsync = promisify(execFile);

/**
 * A signed CDN URL carries `oh`/`oe` signature parameters and is a working, time-limited
 * grant of access to the media. Logs and the Copy Error payload are things the user pastes
 * into a bug report, so they get the path only.
 */
export function redactUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return "(unparseable url)";
  }
}

/** Lowercased extension of a path, without the dot. Empty when there isn't one. */
function extensionOf(filePath: string): string {
  const name = basename(filePath);
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot + 1).toLowerCase();
}

function mimeOf(contentType: string | null): string {
  return contentType?.split(";")[0].trim().toLowerCase() ?? "";
}

/**
 * A signed URL that has expired can still answer `200` — with an HTML error page. Writing
 * that to disk as `.mp4` and reporting success is worse than failing, so require the server
 * to declare *some* media. Which kind it is comes from the payload, not from here: Threads
 * serves voice posts as `video/mp4`.
 */
export function assertMediaResponse(contentType: string | null): void {
  const mime = mimeOf(contentType);
  if (!mime.startsWith("image/") && !mime.startsWith("video/") && !mime.startsWith("audio/")) {
    throw new Error(`Expected an image, video, or audio file, but the server sent ${mime || "an unknown type"}.`);
  }
}

/**
 * The payload's `kind` wins over the response header, which is why this takes both: a voice
 * post arrives as `video/mp4` but is AAC audio in an M4A container, and naming it `.mp4`
 * files it as a video everywhere the user looks.
 */
export function extensionFor(contentType: string | null, kind: MediaKind): string {
  const mime = mimeOf(contentType);

  // The one verified exception, and deliberately only this one: Threads labels voice posts
  // `video/mp4`. Overriding every non-audio type would rename an honestly-declared container
  // (an audio/webm would become .m4a), which is the same mislabelling in the other direction.
  if (kind === "audio" && mime === "video/mp4") return "m4a";

  return EXTENSION_BY_CONTENT_TYPE[mime] ?? FALLBACK_EXTENSION[kind];
}

type Reservation = {
  /** Open handle on the `.part` file the content is streamed into. */
  handle: FileHandle;
  /** Final destination, claimed as an empty placeholder until the rename. */
  filePath: string;
  partPath: string;
};

/**
 * Claim a free destination by creating BOTH the final path and its `.part` sibling with
 * `wx`, then stream into the `.part` and rename over our own placeholder.
 *
 * Claiming the final path is the point: reserving only the `.part` leaves the later
 * `rename()` free to overwrite an unrelated file of the final name that an earlier
 * download left behind — silently, since `rename` does not care that the target exists.
 * `wx` also makes the claim atomic, so two concurrent runs cannot pick the same name.
 */
export async function reservePath(folder: string, name: string, extension: string): Promise<Reservation> {
  for (let counter = 0; counter < MAX_FILENAME_ATTEMPTS; counter++) {
    const suffix = counter === 0 ? "" : ` (${counter})`;
    const filePath = `${folder}/${name}${suffix}.${extension}`;
    const partPath = `${filePath}.part`;

    let claimed = false;
    try {
      const placeholder = await open(filePath, "wx");
      // Mark it claimed BEFORE awaiting close: a rejecting close() would otherwise skip
      // cleanup and strand an empty file under a name nothing will reuse.
      claimed = true;
      await placeholder.close();
      return { handle: await open(partPath, "wx"), filePath, partPath };
    } catch (error) {
      // Release our placeholder before doing anything else — on a non-EEXIST failure
      // (ENOSPC, EACCES) the caller never receives the reservation and so can never clean
      // up the empty final file we just created.
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

export type ConversionResult = {
  /** Where the image ended up — the converted file, or the original if it wasn't converted. */
  path: string;
  /** Why it wasn't converted. Absent on success. The caller logs it. */
  skipped?: string;
};

/**
 * Convert a downloaded image with `sips`, which ships with macOS and reads WebP — so no
 * image dependency is needed. Never throws: a conversion problem must not lose a download
 * that already succeeded, so it reports the original path and the reason instead.
 */
export async function convertImage(filePath: string, format: string): Promise<ConversionResult> {
  const target = IMAGE_FORMATS[format];
  // "original" means leave it alone; anything else unrecognised is worth saying out loud,
  // otherwise the caller logs a conversion that never happened.
  if (!target) {
    return format === "original" ? { path: filePath } : { path: filePath, skipped: `unknown format "${format}"` };
  }

  if (process.platform !== "darwin") {
    return { path: filePath, skipped: `sips is macOS only (platform: ${process.platform})` };
  }

  // Already the requested format — converting would be a round-trip through `sips` for
  // nothing, and worse: the destination it reserves is the file we just downloaded, so the
  // result lands as `name (1).jpg` and the original is deleted. Threads serves JPEG for some
  // posts, so "download as .jpg, then convert to JPEG" is an ordinary path, not an edge case.
  if (extensionOf(filePath) === target.extension) {
    return { path: filePath, skipped: `already ${target.extension}` };
  }

  // Reserve the destination the same way the download did. Writing `<name>.jpg` directly
  // would silently overwrite an unrelated file of that name left by an earlier download.
  //
  // Reserving INSIDE the fallback matters: the download has already succeeded by this point,
  // so a failure to set up conversion must return the saved original, not propagate and make
  // the caller report a file that is on disk as failed.
  const stem = basename(filePath).replace(/\.[^.]+$/, "");
  let reserved: Reservation;
  try {
    // `reservePath` cleans up after itself, so a failure here leaves nothing to release.
    reserved = await reservePath(dirname(filePath), stem, target.extension);
  } catch (error) {
    return { path: filePath, skipped: `couldn't reserve a target: ${String(error)}` };
  }

  try {
    // Closing belongs INSIDE the block that releases the reservation: a rejecting close()
    // would otherwise strand the placeholder and burn that filename for every later run.
    await reserved.handle.close();

    await execFileAsync(
      "sips",
      // An absolute source path can never be read as a `sips` option. (`sips` rejects a
      // `--` separator, so resolving the path is the available guard.)
      ["-s", "format", target.sipsFormat, resolve(filePath), "--out", reserved.partPath],
      { timeout: CONVERT_TIMEOUT_MS },
    );

    // `sips` exits 0 in places it produced nothing usable, so confirm real bytes landed
    // before the original is thrown away.
    const written = await stat(reserved.partPath);
    if (!written.isFile() || written.size === 0) {
      throw new Error("sips produced no output file.");
    }

    await rename(reserved.partPath, reserved.filePath);
    await rm(filePath, { force: true });
  } catch (error) {
    // A failed conversion must not lose the download — keep the original and say so.
    await releaseReservation(reserved.filePath, reserved.partPath);
    return { path: filePath, skipped: `sips failed: ${String(error)}` };
  }

  return { path: reserved.filePath };
}
