import { existsSync } from "node:fs";
import { rename } from "node:fs/promises";
import { resolve } from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { Clipboard, Keyboard, showInFinder, showToast, Toast } from "@raycast/api";
import { failToast, showError } from "@chrismessina/raycast-kit";
// Subpath: `/bytes` carries no `@raycast/api` dependency. Requires `moduleResolution: Node16`.
import { formatBytes } from "@chrismessina/raycast-kit/bytes";
import { logger } from "@chrismessina/raycast-logger";
import type { ThreadsMedia } from "./threads-post";
import {
  assertMediaResponse,
  convertImage,
  extensionFor,
  redactUrl,
  releaseReservation,
  reservePath,
} from "./media-files";

/**
 * A whole download, headers to last byte. Threads media is tens of megabytes at most, so
 * this only ever trips on a connection that has stalled — without it a hung CDN socket
 * leaves the command spinning with no way out.
 */
const DOWNLOAD_TIMEOUT_MS = 5 * 60 * 1000;

/**
 * Module-level gate, mirroring `useAppDownload` in the ios-apps extension. A no-view
 * command can be launched again while the first run is still going — and a user who thinks
 * a long download has stalled will do exactly that — which would otherwise start a second
 * set of transfers writing alongside the first.
 */
let downloadActive = false;

export function beginDownloadRun(): boolean {
  if (downloadActive) return false;
  downloadActive = true;
  return true;
}

export function endDownloadRun(): void {
  downloadActive = false;
}

export async function handleDownload(
  media: ThreadsMedia,
  name: string,
  downloadFolder: string,
  label: string,
  options: { imageFormat?: string } = {},
): Promise<string | null> {
  let progressToast: Toast | undefined;
  let pending: { filePath: string; partPath: string } | undefined;

  try {
    progressToast = await showToast({
      title: `Downloading ${label}`,
      message: "0%",
      style: Toast.Style.Animated,
    });

    logger.log(`[download-media] Downloading ${label}`, { url: redactUrl(media.url) });

    const response = await fetch(media.url, { signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS) });
    logger.log(`[download-media] Media server responded`, {
      status: response.status,
      contentType: response.headers.get("content-type"),
      contentLength: response.headers.get("content-length"),
    });

    if (!response.ok || !response.body) {
      // Nothing will read this body; let go of the socket rather than waiting for GC.
      await response.body?.cancel().catch(() => {});
      throw new Error(`The media server returned ${response.status} ${response.statusText}.`);
    }

    // Everything between here and the pipeline can throw (a bad content type, an unwritable
    // download folder). None of it consumes the body, so release the socket rather than
    // leaving it to a timeout — a carousel would otherwise strand one per failed item.
    const contentType = response.headers.get("content-type");
    let reserved;
    try {
      assertMediaResponse(contentType);
      reserved = await reservePath(resolve(downloadFolder), name, extensionFor(contentType, media.kind));
    } catch (error) {
      await response.body.cancel().catch(() => {});
      throw error;
    }
    const { handle, filePath } = reserved;
    pending = { filePath, partPath: reserved.partPath };

    const declared = Number(response.headers.get("content-length"));
    const total = Number.isFinite(declared) && declared > 0 ? declared : 0;
    let loaded = 0;
    let lastShown = "";

    const trackProgress = new Transform({
      transform(chunk: Buffer, _encoding, callback) {
        loaded += chunk.length;
        // Without a content-length there is no percentage to show, but silence reads as a
        // stall — fall back to bytes so the toast always moves.
        const next = total > 0 ? `${Math.min(100, Math.floor((loaded / total) * 100))}%` : formatBytes(loaded);
        // Toast writes are IPC; only push when the label actually changes.
        if (next !== lastShown) {
          lastShown = next;
          if (progressToast) progressToast.message = next;
        }
        callback(null, chunk);
      },
    });

    // `handle.createWriteStream()` — NOT `createWriteStream("", { fd: handle.fd })`, which
    // leaves the FileHandle and the stream both owning the descriptor and emits
    // "File descriptor N closed but not opened in unmanaged mode" on close.
    await pipeline(Readable.fromWeb(response.body), trackProgress, handle.createWriteStream());

    // A 200 with an empty body is not a download. `existsSync` would happily accept the
    // zero-byte file, so check before it is given its real name.
    if (loaded === 0) {
      throw new Error("The media server sent an empty response.");
    }

    // Only now does the file get its real name, so a half-written download can never be
    // mistaken for a complete one — nor squat on the name a retry wants.
    await rename(reserved.partPath, filePath);
    pending = undefined;

    // Decide from what the server sent, not from the extension we guessed upstream.
    let finalPath = filePath;
    if (media.kind === "image" && options.imageFormat && options.imageFormat !== "original") {
      progressToast.message = "Converting…";
      const conversion = await convertImage(filePath, options.imageFormat);
      finalPath = conversion.path;
      // `convertImage` stays free of @raycast/api so it can be unit-tested, so it reports
      // the reason rather than logging it.
      if (conversion.skipped) {
        logger.log(`[download-media] Kept the original image`, { filePath, reason: conversion.skipped });
      } else {
        logger.log(`[download-media] Converted image`, { from: filePath, to: finalPath });
      }
    }

    // ios-apps verifies the file is really on disk before claiming success; a path is not
    // evidence, and a success toast for a file that isn't there is the worst outcome.
    if (!existsSync(finalPath)) {
      throw new Error("The download finished but the file isn't on disk.");
    }

    progressToast.style = Toast.Style.Success;
    progressToast.title = `Downloaded ${label}`;
    progressToast.message = finalPath;
    progressToast.primaryAction = {
      title: "Show in Finder",
      shortcut: Keyboard.Shortcut.Common.Open,
      onAction: async (toast) => {
        // Reveal can fail (the file moved, the volume went away); swallowing the rejection
        // would leave the action looking like it worked.
        try {
          await showInFinder(finalPath);
        } catch {
          toast.message = "Couldn't reveal the file — it may have moved.";
        }
      },
    };
    progressToast.secondaryAction = {
      title: "Copy Path",
      shortcut: Keyboard.Shortcut.Common.Copy,
      onAction: async (toast) => {
        try {
          await Clipboard.copy(finalPath);
          toast.message = "Path copied to clipboard";
        } catch {
          toast.message = "Couldn't copy the path.";
        }
      },
    };

    logger.log(`[download-media] Download complete`, { filePath: finalPath });
    return finalPath;
  } catch (error) {
    logger.error(`[download-media] Download failed for ${label}`, {
      url: redactUrl(media.url),
      error: String(error),
    });

    if (pending) await releaseReservation(pending.filePath, pending.partPath);

    const report = {
      title: `Couldn't Download ${label}`,
      copyContext: `GET ${redactUrl(media.url)}`,
      // A timeout arrives as an abort, and it is the one abort the user must be told about.
      ignoreAbort: false,
    };
    if (progressToast) failToast(progressToast, error, report);
    else await showError(error, report);

    return null;
  }
}
