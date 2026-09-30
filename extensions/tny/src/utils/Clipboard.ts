import { Clipboard, getSelectedText, showToast, Toast } from "@raycast/api";

export async function getSelectedUrlFromClipboard(): Promise<string | null> {
  let selectedText: string | null = null;

  try {
    selectedText = await getSelectedText();
  } catch (error) {
    const clipboardText = await Clipboard.read();

    if (clipboardText) {
      selectedText = clipboardText.text;
    }
  }

  // Simplified logic to check if the selected text looks like a URL, server-side validation will catch any invalid URLs
  if (!selectedText || !/^http?s:\/\//.test(selectedText)) {
    await showToast({
      title: "Missing URL",
      style: Toast.Style.Failure,
      message: "Please select a URL to shorten!",
    });

    return null;
  }

  return selectedText;
}
