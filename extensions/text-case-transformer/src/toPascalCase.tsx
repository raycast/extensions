import {
  Clipboard,
  getSelectedText,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";

// Simple PascalCase transformation
function toPascalCase(text: string): string {
  return text
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (word) => {
      return word.toUpperCase();
    })
    .replace(/\s+/g, "");
}

export default async function ToPascalCase() {
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

    const transformedText = toPascalCase(selectedText);
    await Clipboard.paste(transformedText);
    await showHUD("Converted to PascalCase");
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to transform text",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
