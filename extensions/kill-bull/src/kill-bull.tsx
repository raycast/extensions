import { Clipboard, showToast, Toast, closeMainWindow, getSelectedText } from "@raycast/api";

export default async function Command() {
  try {
    // Close Raycast window immediately
    await closeMainWindow();

    let sourceText = "";
    let hasSelectedText = false;

    // First try to get selected text
    try {
      sourceText = await getSelectedText();
      if (sourceText && sourceText.trim().length > 0) {
        hasSelectedText = true;
      } else {
        throw new Error("No valid selected text");
      }
    } catch {
      // If no text is selected, try clipboard
      try {
        const clipboardText = await Clipboard.readText();
        if (clipboardText) {
          sourceText = clipboardText;
          hasSelectedText = false;
        }
      } catch {
        // Ignore clipboard errors
      }
    }

    if (!sourceText) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "No text found (neither selected nor in clipboard)",
      });
      return;
    }

    // Process the text
    const cleanedText = cleanBulletPoints(sourceText);

    if (hasSelectedText) {
      // If text was selected, paste the cleaned version directly
      await Clipboard.paste(cleanedText);
      await showToast({
        style: Toast.Style.Success,
        title: "Complete",
        message: "Selected text replaced with cleaned version",
      });
    } else {
      // If from clipboard, copy back to clipboard
      await Clipboard.copy(cleanedText);
      await showToast({
        style: Toast.Style.Success,
        title: "Complete",
        message: "Bullet points removed from clipboard",
      });
    }
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message: `Could not process text: ${error instanceof Error ? error.message : "unknown error"}`,
    });
  }
}

function cleanBulletPoints(text: string): string {
  const lines = text.split("\n");

  const cleanedLines = lines.map((line) => {
    // Keep markdown headers (starting with #)
    if (/^\s*#{1,6}\s/.test(line)) {
      return line;
    }

    // Keep empty lines
    if (line.trim() === "") {
      return line;
    }

    // Regex that matches bullet points with indentation:
    // - Start of line (^)
    // - Zero or more whitespace (tabs, spaces) (\s*)
    // - Bullet point characters ([-*•+])
    // - At least one whitespace or end of line (\s+|$)
    // - Rest of the text (.*)
    const bulletRegex = /^\s*[-*•+](\s+|$)(.*)/;
    const match = line.match(bulletRegex);

    if (match) {
      // Return only the text after bullet point, trimmed
      return match[2].trim();
    }

    // For lines without bullet points, only remove leading whitespace
    return line.replace(/^\s+/, "");
  });

  return cleanedLines.join("\n");
}
