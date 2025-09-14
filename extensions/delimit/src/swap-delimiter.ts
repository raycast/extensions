import { Clipboard, showHUD } from "@raycast/api";

export default async function Command() {
  try {
    // Get current clipboard content
    const clipboardText = await Clipboard.readText();

    if (!clipboardText) {
      await showHUD("❌ Nothing to swap");
      return;
    }

    const trimmedText = clipboardText.trim();
    let convertedText: string;
    let conversionType: string;

    // Check if the text contains newlines (excluding just trailing newlines)
    const hasNewlines = trimmedText.includes("\n");
    const hasCommas = trimmedText.includes(",");

    if (hasNewlines && !hasCommas) {
      // Convert from newlines to commas (no spaces)
      const lines = trimmedText
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      if (lines.length <= 1) {
        await showHUD("❌ Nothing to swap");
        return;
      }

      convertedText = lines.join(",");
      conversionType = "Newlines → Commas";
    } else if (hasCommas && !hasNewlines) {
      // Convert from commas to newlines
      const items = trimmedText
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item.length > 0);

      if (items.length <= 1) {
        await showHUD("❌ Nothing to swap");
        return;
      }

      convertedText = items.join("\n");
      conversionType = "Commas → Newlines";
    } else if (hasNewlines && hasCommas) {
      await showHUD("❌ Ambiguous format");
      return;
    } else {
      await showHUD("❌ Nothing to swap");
      return;
    }

    // Write converted text back to clipboard without creating new history entry
    await Clipboard.copy(convertedText, { concealed: true });

    // Show success HUD
    await showHUD(`✅ ${conversionType}`);
  } catch (error) {
    await showHUD("❌ Failed to swap delimiters");
    console.error("Error swapping delimiters:", error);
  }
}
