import { Clipboard, showHUD } from "@raycast/api";

/**
 * Copy text to clipboard and show confirmation
 */
export async function copyToClipboard(
  text: string,
  message?: string,
): Promise<void> {
  await Clipboard.copy(text);
  if (message) {
    await showHUD(message);
  }
}

/**
 * Copy text and attempt to paste it automatically
 */
export async function copyAndPaste(text: string): Promise<void> {
  await Clipboard.copy(text);

  // Small delay to ensure clipboard is updated
  await new Promise((resolve) => setTimeout(resolve, 100));

  try {
    await Clipboard.paste(text);
    await showHUD("✅ Text copied and automatically inserted");
  } catch (error) {
    await showHUD("📋 Text copied to clipboard (paste with Cmd+V)");
  }
}

/**
 * Format transcription text for better readability
 */
export function formatTranscriptionText(text: string): string {
  return text
    .trim()
    .replace(/\s+/g, " ") // Normalize whitespace
    .replace(/([.!?])\s*([A-Z])/g, "$1 $2"); // Ensure proper spacing after sentences
}
