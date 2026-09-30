import { runUploadClipboard } from "./lib/upload-clipboard-impl.js";

/**
 * Format-locked variant: always pastes as Markdown, regardless of the user's
 * outputFormat preference. Useful for hotkey-bound power users.
 */
export default async function () {
  await runUploadClipboard({ format: "markdown" });
}
