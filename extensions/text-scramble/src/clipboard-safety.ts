import type { Clipboard } from "@raycast/api";

export function canSafelyRestoreClipboard(content: Clipboard.ReadContent): boolean {
  return Boolean(content.file || content.html || typeof content.text === "string");
}
