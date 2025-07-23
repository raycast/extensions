import { Clipboard, showToast, Toast, getSelectedText } from "@raycast/api";

export async function getInputText(): Promise<string> {
  try {
    const selectedText = await getSelectedText();
    if (selectedText) {
      return selectedText;
    }
  } catch {
    // Fall back to clipboard if no selection
  }

  try {
    const clipboardText = await Clipboard.readText();
    return clipboardText || "";
  } catch {
    throw new Error("Unable to get text from selection or clipboard");
  }
}

export async function setOutputText(text: string): Promise<void> {
  await Clipboard.paste(text);
  await showToast({
    style: Toast.Style.Success,
    title: "Text inserted",
  });
}

export async function showError(message: string): Promise<void> {
  await showToast({
    style: Toast.Style.Failure,
    title: "Error",
    message,
  });
}
