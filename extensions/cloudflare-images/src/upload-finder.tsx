import { runUploadFinder } from "./lib/upload-finder-impl.js";

/**
 * Default Upload Selected File command. Uses the user's outputFormat
 * preference. Format-locked variants live in sibling files.
 */
export default async function UploadFinderCommand() {
  await runUploadFinder();
}
