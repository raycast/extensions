import {
  Clipboard,
  getSelectedText,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";

// Simple snake_case transformation
function toSnakeCase(text: string): string {
  return text
    .replace(/\W+/g, " ")
    .split(/ |\B(?=[A-Z])/)
    .map((word) => word.toLowerCase())
    .join("_");
}

export default async function ToSnakeCase() {
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

    const transformedText = toSnakeCase(selectedText);
    await Clipboard.paste(transformedText);
    await showHUD("Converted to snake_case");
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to transform text",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
