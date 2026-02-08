import { Clipboard, showToast, Toast } from "@raycast/api";
import { getSelectedText } from "@raycast/api";

export async function getTextFromSelection(): Promise<string> {
  try {
    const selectedText = await getSelectedText();
    if (selectedText?.trim()) return selectedText.trim();
  } catch {
    console.log("No text selected, trying clipboard");
  }

  try {
    const clipboardText = await Clipboard.readText();
    if (clipboardText?.trim()) return clipboardText.trim();
  } catch (error) {
    console.error("Failed to read clipboard", error);
  }

  await showToast({
    style: Toast.Style.Failure,
    title: "No Text Found",
    message: "Please select text or copy text to clipboard",
  });

  return "";
}
