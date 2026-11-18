import { runUploadFinder } from "./lib/upload-finder-impl.js";

/**
 * Signed-mode-locked variant: always uploads with Signed URLs, regardless
 * of the user's `useSignedUrls` preference, and copies the raw URLs to the
 * clipboard (no format-wrap).
 */
export default async function () {
  await runUploadFinder({ signed: true, copyRawOnly: true });
}
