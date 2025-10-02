import {
  Clipboard,
  getSelectedText,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";

// Simple camelCase transformation without external dependencies
function toCamelCase(text: string): string {
  return text
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
      return index === 0 ? word.toLowerCase() : word.toUpperCase();
    })
    .replace(/\s+/g, "");
}

export default async function ToCamelCase() {
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

    const transformedText = toCamelCase(selectedText);
    await Clipboard.paste(transformedText);
    await showHUD("Converted to camelCase");
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to transform text",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
