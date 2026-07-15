import { getSelectedText, Clipboard } from "@raycast/api";

export async function getRobustSelectedText(): Promise<string> {
  let text = "";
  try {
    text = await getSelectedText();
  } catch {
    // If getting selected text fails (e.g. no accessibility permission or app doesn't support it)
  }

  if (!text || text.trim() === "") {
    // Fallback to clipboard
    const clipboardText = await Clipboard.readText();
    if (clipboardText) {
      text = clipboardText;
    }
  }

  return text.trim();
}
