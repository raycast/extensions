import { getSelectedText, showToast, Toast, Clipboard } from "@raycast/api";

export function wrap(text: string, left: string, right: string = left) {
  return `${left}${text}${right}`;
}

export async function wrapSelectedText(left: string, right: string = left) {
  try {
    const selectedText = await getSelectedText();
    const wrapped = wrap(selectedText, left, right);

    await Clipboard.paste(wrapped);

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
