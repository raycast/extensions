import { Clipboard, open, showToast, Toast } from "@raycast/api";
import { stat } from "node:fs/promises";
import path from "node:path";
import { getStatus, uploadFile } from "../api/client";
import type { Upload } from "../api/types";
import { showAktarFailure } from "./errors";
import { expiryNote, expiryWarning, isExpiryNotSetUp } from "./expiry";
import { fetchFormat, formatUploads } from "./output";

export type UploadTarget = {
  destinationId?: string;
  /** Upload into this folder under each file's own name instead of the path template. */
  prefix?: string;
  /** Days until Aktar deletes the files; 0 or undefined keeps them. Not allowed together with `prefix`. */
  expires?: number;
  /** A new name for the upload, extension included. Only used when uploading a single file. */
  filename?: string;
};

/** Keeps regular files and reports how many folders (or missing paths) were skipped. */
export async function onlyFiles(paths: string[]) {
  const files: string[] = [];
  for (const candidate of paths) {
    try {
      if ((await stat(candidate)).isFile()) files.push(candidate);
    } catch {
      // A path that vanished since it was picked is simply skipped.
    }
  }
  return { files, skipped: paths.length - files.length };
}

/**
 * Uploads files one after another with a progress toast, then copies all
 * their links in the preferred format. Returns what was uploaded; a failed
 * file doesn't stop the rest.
 */
export async function uploadPaths(paths: string[], target: UploadTarget = {}): Promise<Upload[]> {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Connecting to Aktar" });
  try {
    // Fails fast (and clearly) when Aktar can't be reached, before streaming any bytes.
    await getStatus();
  } catch (error) {
    await showAktarFailure(error, "Upload failed");
    return [];
  }

  const uploads: Upload[] = [];
  const failures: string[] = [];
  const { filename, ...destination } = target;
  for (const [index, filePath] of paths.entries()) {
    const rename = paths.length === 1 ? filename : undefined;
    const name = rename || path.basename(filePath);
    toast.title = paths.length > 1 ? `Uploading ${index + 1} of ${paths.length}` : `Uploading ${name}`;
    toast.message = paths.length > 1 ? name : undefined;
    try {
      const upload = await uploadFile(filePath, {
        ...destination,
        filename: rename,
        onProgress: (fraction) => {
          toast.message = `${paths.length > 1 ? `${name} · ` : ""}${Math.round(fraction * 100)}%`;
        },
      });
      uploads.push(upload);
    } catch (error) {
      failures.push(`${name}: ${error instanceof Error ? error.message : String(error)}`);
      if (paths.length === 1) {
        await showAktarFailure(error, "Upload failed");
        return [];
      }
      // Auto-delete not being set up applies to the whole destination, so the
      // remaining files would fail the same way. Any other error is about this
      // file only, and the rest still go up.
      if (isExpiryNotSetUp(error)) {
        if (uploads.length === 0) {
          await showAktarFailure(error, "Upload failed");
          return [];
        }
        const reason = error instanceof Error ? error.message : String(error);
        failures.push(...paths.slice(index + 1).map((rest) => `${path.basename(rest)}: ${reason}`));
        break;
      }
    }
  }

  if (uploads.length > 0) {
    await Clipboard.copy(formatUploads(uploads, await fetchFormat()));
  }

  const warning = expiryWarning(uploads, target.expires);
  if (failures.length === 0) {
    toast.style = Toast.Style.Success;
    if (uploads.length === 1) {
      toast.title = uploads[0].reused ? "Already uploaded" : `Uploaded ${uploads[0].filename}`;
      toast.message = uploads[0].reused
        ? `Copied the existing link.${expiryNote(uploads[0])}`
        : "Link copied to clipboard";
    } else {
      const summary = batchSummary(uploads);
      toast.title = summary.title;
      toast.message = `${summary.note}Links copied to clipboard`;
    }
    if (warning) {
      toast.style = Toast.Style.Failure;
      toast.message = `${toast.message}. ${warning}`;
    }
    if (uploads.length === 1) {
      toast.primaryAction = { title: "Open in Browser", onAction: () => open(uploads[0].url) };
    }
  } else {
    toast.style = Toast.Style.Failure;
    const reused = uploads.filter((upload) => upload.reused).length;
    toast.title = `Uploaded ${uploads.length - reused} of ${paths.length} files`;
    toast.message = `${reused > 0 ? `${reused} already uploaded. ` : ""}${warning ? `${failures[0]}. ${warning}` : failures[0]}`;
  }
  return uploads;
}

/**
 * The title for several finished uploads, counting only the files that were
 * actually uploaded, and a note ("2 already uploaded. ") for the ones whose
 * existing links Aktar reused instead.
 */
export function batchSummary(uploads: Upload[]) {
  const reused = uploads.filter((upload) => upload.reused).length;
  const uploaded = uploads.length - reused;
  if (uploaded === 0) return { title: `All ${reused} files already uploaded`, note: "" };
  return {
    title: `Uploaded ${uploaded} ${uploaded === 1 ? "file" : "files"}`,
    note: reused > 0 ? `${reused} already uploaded. ` : "",
  };
}
