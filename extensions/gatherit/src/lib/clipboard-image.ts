import { Clipboard, showHUD, showToast, Toast } from "@raycast/api";
import { unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { GatherReference } from "./api";

const MIME_TO_EXT: Record<string, string> = {
  "image/webp": "webp",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/svg+xml": "svg",
};

function imageExtension(contentType: string | null, url: string): string {
  const mime = contentType?.split(";")[0]?.trim().toLowerCase();
  if (mime && MIME_TO_EXT[mime]) return MIME_TO_EXT[mime];
  try {
    const ext = new URL(url).pathname.split(".").pop()?.toLowerCase();
    if (ext && /^[a-z0-9]{2,5}$/.test(ext)) return ext;
  } catch {
    // ignore malformed URLs
  }
  return "webp";
}

/**
 * Copy a reference's image to the clipboard as a file. Raycast can only put a
 * *file* on the clipboard (not a remote URL), so we download the presigned R2
 * image to a temp file first, then copy that.
 */
export async function copyImageToClipboard(
  ref: GatherReference,
): Promise<void> {
  if (!ref.imageUrl) {
    await showToast({
      style: Toast.Style.Failure,
      title: "This reference has no image",
    });
    return;
  }
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Copying image…",
  });
  // Declared outside the try so the finally block can clean it up regardless
  // of where we exit.
  let file: string | undefined;
  try {
    const res = await fetch(ref.imageUrl);
    if (!res.ok) throw new Error(`Download failed (${res.status})`);
    const buffer = Buffer.from(await res.arrayBuffer());
    const ext = imageExtension(res.headers.get("content-type"), ref.imageUrl);
    file = join(tmpdir(), `gather-${ref.id}.${ext}`);
    await writeFile(file, buffer);
    await Clipboard.copy({ file });
    toast.hide();
    await showHUD("Image copied ✓");
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Couldn't copy image";
    toast.message = error instanceof Error ? error.message : String(error);
  } finally {
    // `Clipboard.copy` has read the file into the pasteboard by the time it
    // resolves, so the temp file is no longer needed. Remove it to avoid
    // accumulating orphaned gather-* image files in the temp dir. Best-effort:
    // ignore errors (e.g. the write never happened on the failure path).
    if (file) await unlink(file).catch(() => {});
  }
}
