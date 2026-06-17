import { getSelectedText, showToast, Toast, Clipboard } from "@raycast/api";

export function wrap(text: string, left: string, right: string = left) {
  return `${left}${text}${right}`;
}

export async function wrapSelectedText(left: string, right: string = left) {
  try {
    const selectedText = await getSelectedText();
    const wrapped = wrap(selectedText, left, right);

    // Save clipboard contents before paste so we can restore them afterward.
    // Clipboard.paste() copies the text into the clipboard before simulating
    // Cmd+V, which would otherwise clobber whatever the user had there.
    const previousClipboard = await Clipboard.read();

    await Clipboard.paste(wrapped);
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Restore the previous clipboard content.
    if (previousClipboard.text !== undefined) {
      await Clipboard.copy(previousClipboard.text);
    } else if (previousClipboard.file !== undefined) {
      await Clipboard.copy({ file: previousClipboard.file });
    }
    // If the clipboard was empty we leave it as-is (containing the wrapped
    // text), which is a reasonable fallback.

    await showToast({
      style: Toast.Style.Success,
      title: "Text wrapped!",
      message: wrapped,
    });
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: "No text selected",
      message: "Select some text first, then try again",
    });
  }
}
