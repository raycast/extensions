import { runUploadClipboard } from "./lib/upload-clipboard-impl.js";

/**
 * Combo-locked variant: force Signed URL + HTML format + paste at
 * cursor. Single-hotkey path for "I want a signed HTML <img> tag"
 * without changing preferences. Combines the `as Signed` axis with the
 * `as HTML` axis.
 */
export default async function () {
  await runUploadClipboard({ signed: true, format: "html" });
}
