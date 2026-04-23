import { Clipboard, getSelectedText } from "@raycast/api";

export async function readSelectionOrClipboard(): Promise<{
  text: string;
  source: "selection" | "clipboard";
}> {
  try {
    const selectedText = await getSelectedText();

    if (selectedText.trim()) {
      return {
        text: selectedText,
        source: "selection",
      };
    }
  } catch {
    // Raycast throws when no text is selected or the frontmost app does not expose selection.
  }

  const clipboardText = await Clipboard.readText();

  return {
    text: clipboardText ?? "",
    source: "clipboard",
  };
}
