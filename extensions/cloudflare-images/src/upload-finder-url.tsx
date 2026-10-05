import { runUploadFinder } from "./lib/upload-finder-impl.js";

/**
 * Format-locked variant: copies raw URLs, regardless of preference. The
 * "just give me the URL" path for power users. Pair with a Finder hotkey
 * for fast image-link grabbing.
 */
export default async function () {
  await runUploadFinder({ format: "raw" });
}
