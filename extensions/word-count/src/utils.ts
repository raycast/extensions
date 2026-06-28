import { Clipboard, Toast, getSelectedText, showToast } from "@raycast/api";

export async function readFromClipboard(toast: boolean = true) {
  const clipboard = await Clipboard.readText();

  if (!clipboard) return "";

  if (toast) {
    showToast({
      style: Toast.Style.Success,
      title: `Text loaded from clipboard`,
      message: `[⌘ + E] to reset`,
    });
  }

  return clipboard.trim();
}

export async function readFromSelection(toast: boolean = true) {
  try {
    const selectedText = await getSelectedText();

    if (selectedText) {
      if (toast) {
        showToast({
          style: Toast.Style.Success,
          title: `Text loaded from selected text`,
          message: `[⌘ + E] to reset`,
        });
      }

      return selectedText.trim();
    }
  } catch {
    // ignore error, fallback to an empty string
  }

  return "";
}
