import {
  Clipboard,
  getSelectedText,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";

export default async function ToUppercase() {
  try {
    const selectedText = await getSelectedText();
    if (!selectedText.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No text selected",
        message: "Please select some text first",
      });
      return;
    }

    const transformedText = selectedText.toUpperCase();
    await Clipboard.paste(transformedText);
    await showHUD("Converted to UPPERCASE");
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to transform text",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
