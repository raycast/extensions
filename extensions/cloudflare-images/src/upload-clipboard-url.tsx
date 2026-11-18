import { runUploadClipboard } from "./lib/upload-clipboard-impl.js";

/**
 * Format-locked variant: always pastes a raw URL, regardless of the user's
 * outputFormat preference. The "just give me the link" path, covers the
 * user case of needing the URL for Slack, a JSON field, a CSS background,
 * etc., without any markup wrapping.
 */
export default async function () {
  await runUploadClipboard({ format: "raw" });
}
