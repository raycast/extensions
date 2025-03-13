import { Clipboard } from "@raycast/api";
import { promisify } from "util";
import { exec } from "child_process";
import { showFailureToast } from "@raycast/utils";

const execPromise = promisify(exec);

/**
 * Get selected text from the current application
 */
export async function getSelectedText(): Promise<string | null> {
  try {
    // Save the current clipboard content
    const previousClipboard = await Clipboard.read();
    const previousText = previousClipboard.text || "";

    // Simulate cmd+c to copy selected text
    await execPromise('osascript -e \'tell application "System Events" to keystroke "c" using command down\'');

    // Small delay to ensure clipboard is updated
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Read the new clipboard content (which should be the selected text)
    const selectedText = await Clipboard.readText();

    // If selectedText is undefined or empty, return null
    if (!selectedText) {
      // Restore previous clipboard if needed
      if (previousText) {
        await Clipboard.paste(previousText);
      }
      return null;
    }

    // If nothing was selected, the clipboard content won't change
    if (selectedText === previousText) {
      return null;
    }

    // Restore previous clipboard content if needed
    if (previousText && previousText !== selectedText) {
      await Clipboard.paste(previousText);
    }

    return selectedText;
  } catch (error) {
    console.error("Failed to get selected text:", error);
    await showFailureToast({
      title: "Failed to get selected text",
      message: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
