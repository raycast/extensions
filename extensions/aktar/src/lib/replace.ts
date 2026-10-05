import { Clipboard, open, showToast, Toast } from "@raycast/api";
import path from "node:path";
import { getStatus, isReplaceUnsupported, replaceObject, replaceUpload } from "../api/client";
import type { Upload } from "../api/types";
import { showAktarFailure } from "./errors";
import { fetchFormat, formatUploads } from "./output";
import { isWindows } from "./platform";

/** What a new file is written over: an upload in history, or an object in a bucket. */
export type ReplaceTarget =
  { kind: "upload"; id: string; name: string } | { kind: "object"; destinationId: string; key: string; name: string };

/** The Aktar version that can replace files on this platform. */
export const REPLACE_MIN_VERSION = isWindows ? "Aktar for Windows 0.7.0" : "Aktar for Mac 0.14.0";

/**
 * Writes `filePath` over `target` with a progress toast, then copies the link
 * (the same one as before) in the preferred format. Returns the upload, or
 * undefined when it failed.
 */
export async function replaceFile(target: ReplaceTarget, filePath: string): Promise<Upload | undefined> {
  const toast = await showToast({ style: Toast.Style.Animated, title: `Replacing ${target.name}` });
  try {
    await getStatus();
    const onProgress = (fraction: number) => {
      toast.message = `${path.basename(filePath)} · ${Math.round(fraction * 100)}%`;
    };
    const upload =
      target.kind === "upload"
        ? await replaceUpload(target.id, filePath, onProgress)
        : await replaceObject(target.destinationId, target.key, filePath, onProgress);
    await Clipboard.copy(formatUploads([upload], await fetchFormat()));
    toast.style = Toast.Style.Success;
    toast.title = `Replaced ${target.name}`;
    toast.message = "Same link, copied to clipboard";
    toast.primaryAction = { title: "Open in Browser", onAction: () => open(upload.url) };
    return upload;
  } catch (error) {
    if (isReplaceUnsupported(error)) {
      toast.style = Toast.Style.Failure;
      toast.title = "Update Aktar to replace files";
      toast.message = `Replacing a file needs ${REPLACE_MIN_VERSION} or later.`;
      return undefined;
    }
    await showAktarFailure(error, "Couldn't replace the file");
    return undefined;
  }
}
