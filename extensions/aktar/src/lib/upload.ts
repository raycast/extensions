import { Clipboard, open, showToast, Toast } from "@raycast/api";
import { stat } from "node:fs/promises";
import path from "node:path";
import { getStatus, uploadFile } from "../api/client";
import type { Upload } from "../api/types";
import { showAktarFailure } from "./errors";
import { fetchFormat, formatUploads } from "./output";

export type UploadTarget = {
  destinationId?: string;
  /** Upload into this folder under each file's own name instead of the path template. */
  prefix?: string;
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
  for (const [index, filePath] of paths.entries()) {
    const name = path.basename(filePath);
    toast.title = paths.length > 1 ? `Uploading ${index + 1} of ${paths.length}` : `Uploading ${name}`;
    toast.message = paths.length > 1 ? name : undefined;
    try {
      const upload = await uploadFile(filePath, {
        ...target,
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
    }
  }

  if (uploads.length > 0) {
    await Clipboard.copy(formatUploads(uploads, await fetchFormat()));
  }

  if (failures.length === 0) {
    toast.style = Toast.Style.Success;
    toast.title = uploads.length === 1 ? `Uploaded ${uploads[0].filename}` : `Uploaded ${uploads.length} files`;
    toast.message = uploads.length === 1 ? "Link copied to clipboard" : "Links copied to clipboard";
    if (uploads.length === 1) {
      toast.primaryAction = { title: "Open in Browser", onAction: () => open(uploads[0].url) };
    }
  } else {
    toast.style = Toast.Style.Failure;
    toast.title = `Uploaded ${uploads.length} of ${paths.length} files`;
    toast.message = failures[0];
  }
  return uploads;
}
