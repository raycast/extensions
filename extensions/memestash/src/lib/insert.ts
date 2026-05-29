/**
 * Platform-specific INSERT layer — the one place that knows how an image is
 * represented on the clipboard. Kept deliberately thin and isolated so the
 * library/search code never depends on the paste mechanism. If we ever need a
 * raw-image-data or AppleScript-driven mode for a specific app, it changes here
 * and nowhere else.
 *
 * Phase 0 spike findings (macOS): pasting a `{ file }` inlines the image in apps
 * that support inline images (Messages, Notes) and uploads it in Slack (Slack
 * has no inline-image-in-text concept, so an attachment is the best achievable
 * there). Pasting the file also preserves animated GIFs, which putting raw
 * bitmap data on the clipboard would flatten to a single frame — so file is the
 * right primitive for a meme library.
 */
import { Clipboard } from "@raycast/api";

/**
 * Build the clipboard content for an image at `path`. Used with the built-in
 * Action.Paste / Action.CopyToClipboard actions, which handle window-closing,
 * focus restoration, and the HUD for us.
 */
export function imageClipboardContent(path: string): Clipboard.Content {
  return { file: path };
}
