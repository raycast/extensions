import { getSelectedText, Clipboard, showToast, Toast } from "@raycast/api";

/**
 * Get input text from the user's selection, falling back to clipboard.
 * Throws a user-friendly error if neither source has text.
 */
export async function getInputText(): Promise<string> {
  // Try selected text first
  try {
    const selected = await getSelectedText();
    if (selected.trim()) return selected;
  } catch {
    // getSelectedText throws if no selection or app doesn't support it
  }

  // Fall back to clipboard
  const clipboard = await Clipboard.readText();
  if (clipboard?.trim()) return clipboard;

  await showToast({
    style: Toast.Style.Failure,
    title: "No Text Found",
    message: "Select text in any app or copy it to clipboard first",
  });
  throw new Error("No input text available");
}
