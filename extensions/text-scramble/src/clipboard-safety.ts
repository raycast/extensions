import type { Clipboard } from "@raycast/api";

export function getRestorableClipboardContent(content: Clipboard.ReadContent): string | Clipboard.Content | null {
  if (typeof content.text !== "string" || typeof content.file === "string") return null;
  if (typeof content.html === "string") return { html: content.html, text: content.text };
  return content.text;
}

export function canSafelyRestoreClipboard(content: Clipboard.ReadContent): boolean {
  return getRestorableClipboardContent(content) !== null;
}
