import { runUploadFinder } from "./lib/upload-finder-impl.js";

/**
 * Public-mode-locked variant: always uploads with Public URLs, regardless
 * of the user's `useSignedUrls` preference, and copies the raw URLs to the
 * clipboard (no format-wrap).
 *
 * User-facing title is "Upload Selected File as Image".
 */
export default async function () {
  await runUploadFinder({ signed: false, copyRawOnly: true });
}
