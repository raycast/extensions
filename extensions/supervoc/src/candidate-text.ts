import { Clipboard, getSelectedText } from "@raycast/api";

export async function candidateText(): Promise<string> {
  try {
    const selected = await getSelectedText();
    if (selected.trim()) return selected;
  } catch {
    // No frontmost selection — fall back to the clipboard.
  }
  const clipboard = await Clipboard.readText();
  return clipboard?.trim() ? clipboard : "";
}
