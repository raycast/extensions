import { runUploadFinder } from "./lib/upload-finder-impl.js";

/**
 * Format-locked variant: copies as Markdown, regardless of preference.
 */
export default async function () {
  await runUploadFinder({ format: "markdown" });
}
