import { runUploadFinder } from "./lib/upload-finder-impl.js";

/**
 * Format-locked variant: copies as HTML `<img>` tags, regardless of preference.
 */
export default async function () {
  await runUploadFinder({ format: "html" });
}
