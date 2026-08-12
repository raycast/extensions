import type { Clipboard } from "@raycast/api";

export function canSafelyRestoreClipboard(content: Clipboard.ReadContent): boolean {
  const hasFile = typeof content.file === "string";
  const hasHTML = typeof content.html === "string";

  return typeof content.text === "string" && !(hasFile && hasHTML);
}
