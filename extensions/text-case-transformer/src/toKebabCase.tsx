import {
  Clipboard,
  getSelectedText,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";

// Simple kebab-case transformation
function toKebabCase(text: string): string {
  return text
    .replace(/\W+/g, " ")
    .split(/ |\B(?=[A-Z])/)
    .map((word) => word.toLowerCase())
    .join("-");
}

export default async function ToKebabCase() {
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

    const transformedText = toKebabCase(selectedText);
    await Clipboard.paste(transformedText);
    await showHUD("Converted to kebab-case");
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to transform text",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
