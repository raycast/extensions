import { Clipboard, showHUD } from "@raycast/api";
import { raycastConverter } from "./raycast-converter.js";

export default async function ConvertClipboard() {
  try {
    const result = await raycastConverter.convertFromClipboard();

    if (result.trim()) {
      await Clipboard.copy(result);
      await showHUD("✓ Converted to Markdown");
    } else {
      await showHUD("✗ No rich text found in clipboard");
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    await showHUD(`✗ Conversion failed: ${errorMessage}`);
  }
}
