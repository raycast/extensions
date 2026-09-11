import { runUploadFinder } from "./lib/upload-finder-impl.js";

/**
 * Combo-locked variant: force Signed URLs + Markdown format + copy to
 * clipboard. Single-hotkey path for "I want signed Markdown image
 * references for selected Finder files" without changing preferences.
 * Combines the `as Signed` axis with the `as Markdown` axis.
 */
export default async function () {
  await runUploadFinder({ signed: true, format: "markdown" });
}
