import { Clipboard, showHUD, getSelectedText } from "@raycast/api";

// Helper function to get selected text
async function getSelectedTextSafely(): Promise<string> {
  try {
    return await getSelectedText();
  } catch {
    return (await Clipboard.readText()) || "";
  }
}

// Helper function to replace text
async function replaceText(text: string): Promise<void> {
  await Clipboard.copy(text);
  await new Promise((resolve) => setTimeout(resolve, 50));
  await Clipboard.paste(text);
}

export default async function Command() {
  try {
    const selectedText = await getSelectedTextSafely();

    if (!selectedText || selectedText.trim().length === 0) {
      await showHUD("❌ No text selected");
      return;
    }

    const transformedText = selectedText.toUpperCase();
    await replaceText(transformedText);
    await showHUD("UPPERCASE");
  } catch (error) {
    console.error("Error transforming text:", error);
    await showHUD("❌ Failed to transform text");
  }
}
