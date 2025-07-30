import { execSync } from "node:child_process";
import { Clipboard, getPreferenceValues, showHUD } from "@raycast/api";
import TurndownService from "turndown";

async function getClipboardHTML(): Promise<string> {
  // Helper function to get HTML from clipboard using AppleScript as @raycast/api clipboard does not read HTML from the clipboard properly
  let clipboardContent = "";

  try {
    const result = execSync(
      `osascript -e 'the clipboard as «class HTML»' | perl -ne 'print chr foreach unpack("C*",pack("H*",substr($_,11,-3)))'`,
      { encoding: "utf8", timeout: 1000 },
    );
    clipboardContent = result.trim();
  } catch (error) {
    console.error("Failed to get HTML via AppleScript:", error);
  }

  // Fallback: Get plain text from the clipboard
  if (clipboardContent === "") {
    try {
      clipboardContent = (await Clipboard.readText()) ?? "";
    } catch (error) {
      console.error("Failed to get plain text from clipboard:", error);
    }
  }

  return clipboardContent;
}

// Main command function
export default async function Command() {
  try {
    // Get user preferences
    const preferences = getPreferenceValues<Preferences.PasteToMarkdown>();

    // Initialize and configure Turndown service
    const turndownService = new TurndownService({
      headingStyle: preferences.headingStyle,
      hr: preferences.hr,
      bulletListMarker: preferences.bulletListMarker,
      codeBlockStyle: preferences.codeBlockStyle,
      fence: preferences.fence,
      emDelimiter: preferences.emDelimiter,
      strongDelimiter: preferences.strongDelimiter,
      linkStyle: preferences.linkStyle,
      linkReferenceStyle: preferences.linkReferenceStyle,
    });

    console.debug("Trying to get HTML...");
    const html = await getClipboardHTML();
    if (html.trim() !== "") {
      console.debug("Found HTML:", html.substring(0, 100) + "...");
    } else {
      await showHUD("Clipboard does not contain formattable content.");
      return;
    }

    // Perform the conversion
    let markdown;
    try {
      markdown = turndownService.turndown(html);
    } catch (error) {
      console.error("Failed to convert HTML to Markdown:", error);
      await showHUD("Error: Could not convert HTML content.");
      return;
    }

    // Check if conversion resulted in meaningful content
    if (!markdown || markdown.trim() === "") {
      await showHUD("Conversion resulted in empty content.");
      return;
    }

    // Paste the result and show confirmation
    try {
      await Clipboard.paste(markdown);
      await showHUD("Pasted!");
    } catch (error) {
      console.error("Failed to paste content:", error);
      await showHUD("Error: Could not paste converted content.");
    }
  } catch (error) {
    console.error("Unexpected error:", error);
    await showHUD("Error: An unexpected error occurred.");
  }
}
