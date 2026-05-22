import { Clipboard, getSelectedText, showToast, Toast } from "@raycast/api";

/**
 * Return the text to read aloud: the current selection, or — when nothing is
 * selected — the most recent clipboard entry. Returns null (with a toast) if
 * neither source has usable text.
 */
export async function readInputText(): Promise<string | null> {
  let text = "";

  try {
    text = await getSelectedText();
  } catch {
    // No selection — fall back to the clipboard below.
  }

  if (!text.trim()) {
    text = (await Clipboard.readText()) ?? "";
  }

  if (!text.trim()) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Nothing to read",
      message: "Select some text, or copy it to the clipboard first.",
    });
    return null;
  }

  return text;
}
