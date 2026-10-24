import { runUploadFinder } from "./lib/upload-finder-impl.js";

/**
 * Combo-locked variant: force Signed URLs + HTML format + copy to
 * clipboard. Single-hotkey path for "I want signed HTML <img> tags for
 * selected Finder files" without changing preferences. Combines the
 * `as Signed` axis with the `as HTML` axis.
 */
export default async function () {
  await runUploadFinder({ signed: true, format: "html" });
}
