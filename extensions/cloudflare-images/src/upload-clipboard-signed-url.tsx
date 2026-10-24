import { runUploadClipboard } from "./lib/upload-clipboard-impl.js";

/**
 * Combo-locked variant: force Signed URL + raw URL format + paste at
 * cursor. Single-hotkey path for "I want a signed link pasted at cursor
 * without any Markdown / HTML wrapping" without changing preferences.
 * Combines the `as Signed` axis with the `as URL` axis.
 *
 * Note: this differs from `Upload Clipboard as Signed Image` (which is
 * also raw-URL but COPIES to clipboard instead of pasting at cursor).
 */
export default async function () {
  await runUploadClipboard({ signed: true, format: "raw" });
}
