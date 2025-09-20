import { Clipboard, Toast, getSelectedText, showToast } from "@raycast/api";

export async function readFromClipboard() {
  const clipboard = await Clipboard.readText();

  if (!clipboard) return "";

  showToast({
    style: Toast.Style.Success,
    title: `Text loaded from clipboard`,
    message: `[⌘ + E] to reset`,
  });

  return clipboard.trim();
}

export async function readFromSelection() {
  try {
    const selectedText = await getSelectedText();

    if (selectedText) {
      showToast({
        style: Toast.Style.Success,
        title: `Text loaded from selected text`,
        message: `[⌘ + E] to reset`,
      });

      return selectedText.trim();
    }
  } catch {
    // ignore error, fallback to an empty string
  }

  return "";
}
