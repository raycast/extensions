import { runUploadClipboard } from "./lib/upload-clipboard-impl.js";

/**
 * Format-locked variant: always pastes as an HTML `<img>` tag, regardless of
 * the user's outputFormat preference.
 */
export default async function () {
  await runUploadClipboard({ format: "html" });
}
