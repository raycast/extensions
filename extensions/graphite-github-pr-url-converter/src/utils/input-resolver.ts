import { Clipboard, getSelectedText } from "@raycast/api";

/**
 * Check if a string looks like a URL
 */
function looksLikeUrl(text: string): boolean {
  const trimmed = text.trim();
  return /^https?:\/\//i.test(trimmed);
}

/**
 * Resolve input URL from various sources in priority order:
 * 1. Currently selected text (if it looks like a URL)
 * 2. Clipboard contents (if it looks like a URL)
 * 3. Returns null (caller should prompt for manual input)
 */
export async function resolveInputUrl(): Promise<string | null> {
  // Try selected text first
  try {
    const selectedText = await getSelectedText();
    if (selectedText && looksLikeUrl(selectedText)) {
      return selectedText.trim();
    }
  } catch {
    // No selection available, continue to clipboard
  }

  // Try clipboard
  try {
    const clipboardText = await Clipboard.readText();
    if (clipboardText && looksLikeUrl(clipboardText)) {
      return clipboardText.trim();
    }
  } catch {
    // Clipboard read failed, continue
  }

  return null;
}
