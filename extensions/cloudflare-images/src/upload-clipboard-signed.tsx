import { runUploadClipboard } from "./lib/upload-clipboard-impl.js";

/**
 * Signed-mode-locked variant: always uploads with a Signed URL, regardless
 * of the user's `useSignedUrls` preference, and copies the raw URL to the
 * clipboard (no format-wrap, no cursor-paste). Bind a hotkey if you
 * frequently need a signed URL for one image while leaving your default
 * unsigned.
 */
export default async function () {
  await runUploadClipboard({ signed: true, copyRawOnly: true });
}
