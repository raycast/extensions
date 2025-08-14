import { getSelectedText, showToast, Toast } from "@raycast/api";

export async function getTextFromSelectionOrClipboard(): Promise<
  string | null
> {
  // Get selected text first
  let textToProcess = await getSelectedText();

  // If no text is selected, try to get from clipboard
  if (!textToProcess.trim()) {
    try {
      // Use AppleScript to get clipboard content
      const { execSync } = await import("child_process");
      const clipboardText = execSync("pbpaste", { encoding: "utf8" }).trim();

      if (clipboardText) {
        textToProcess = clipboardText;
        showToast(Toast.Style.Success, "Using text from clipboard");
        return textToProcess;
      } else {
        showToast(
          Toast.Style.Failure,
          "No text selected and clipboard is empty",
        );
        return null;
      }
    } catch (clipboardError) {
      showToast(
        Toast.Style.Failure,
        "No text selected and couldn't access clipboard",
      );
      return null;
    }
  }

  return textToProcess;
}
