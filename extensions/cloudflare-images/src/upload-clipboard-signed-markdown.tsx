import { runUploadClipboard } from "./lib/upload-clipboard-impl.js";

/**
 * Combo-locked variant: force Signed URL + Markdown format + paste at
 * cursor. Single-hotkey path for "I want a signed Markdown image"
 * without changing preferences. Combines the `as Signed` axis with the
 * `as Markdown` axis.
 */
export default async function () {
  await runUploadClipboard({ signed: true, format: "markdown" });
}
