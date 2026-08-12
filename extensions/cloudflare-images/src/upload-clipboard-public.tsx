import { runUploadClipboard } from "./lib/upload-clipboard-impl.js";

/**
 * Public-mode-locked variant: always uploads with a Public URL, regardless
 * of the user's `useSignedUrls` preference, and copies the raw URL to the
 * clipboard (no format-wrap, no cursor-paste). Bind a hotkey if your
 * default is signed but you occasionally want a publicly-shareable URL.
 *
 * User-facing title is "Upload Clipboard as Image", "Public" stays in
 * the file name as it accurately describes the internal lock.
 */
export default async function () {
  await runUploadClipboard({ signed: false, copyRawOnly: true });
}
