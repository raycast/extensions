import { Clipboard, showHUD } from "@raycast/api";
import { PackageManager, conversionPatterns } from "./patterns";

export type { PackageManager } from "./patterns";

export async function convertCommand(from: string = "npm", to: PackageManager) {
  try {
    const clipboardText = await Clipboard.readText();

    if (!clipboardText) {
      await showHUD("⚠️ Clipboard is empty");
      return;
    }

    // Apply conversions based on selected package manager
    let converted = clipboardText;
    const patterns = conversionPatterns[to];

    for (const pattern of patterns) {
      // Handle both string and function replacements
      if (typeof pattern.to === "string") {
        converted = converted.replace(pattern.from, pattern.to as string);
      } else {
        converted = converted.replace(pattern.from, pattern.to as (substring: string, ...args: string[]) => string);
      }
    }

    if (converted !== clipboardText) {
      await Clipboard.copy(converted);
      await Clipboard.paste(converted);
      await showHUD(`✅ Converted ${from} to ${to}`);
    } else {
      await showHUD("ℹ️ No npm command found in clipboard");
    }
  } catch (error) {
    console.error("Error converting clipboard:", error);
    await showHUD("❌ Error converting clipboard text");
  }
}
