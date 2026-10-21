import { Clipboard } from "@raycast/api";
import { clipboardRestoreContent, type ClipboardSnapshot } from "../lib/replace";

export async function restoreClipboard(previous: ClipboardSnapshot): Promise<void> {
  const restore = clipboardRestoreContent(previous);
  if (restore) await Clipboard.copy(restore, { concealed: true });
  else await Clipboard.clear();
}
