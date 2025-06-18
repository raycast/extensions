import { Clipboard, showHUD, getPreferenceValues } from "@raycast/api";
import { formatForTana } from "./utils/tana-formatter";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

/**
 * Raycast command that converts clipboard content to Tana format and opens Tana app
 * Reads text from the clipboard, converts it to Tana's paste format, copies it back,
 * and attempts to open the Tana application
 */
export default async function Command() {
  const preferences = getPreferenceValues<Preferences>();

  try {
    // Get clipboard content directly - no need to try selected text for quick clipboard command
    const clipboardText = await Clipboard.readText();

    if (!clipboardText) {
      await showHUD("Clipboard is empty");
      return;
    }

    // Convert to Tana format - let the system auto-detect content type
    const noteTag = preferences.noteTag;
    const tanaOutput = formatForTana({
      content: clipboardText,
      noteTag,
      urlField: preferences.urlField,
      authorField: preferences.authorField,
      transcriptField: preferences.transcriptField,
      contentField: preferences.contentField,
      includeAuthor: preferences.includeAuthor,
      includeDescription: preferences.includeDescription,
    });

    // Copy back to clipboard
    await Clipboard.copy(tanaOutput);

    // Open Tana
    try {
      await execAsync("open tana://");
      await showHUD("Tana format copied to clipboard. Opening Tana... ✨");
    } catch (error) {
      console.error("Error opening Tana:", error);
      await showHUD(
        "Tana format copied to clipboard (but couldn't open Tana) ✨",
      );
    }
  } catch (error) {
    console.error("Error processing clipboard:", error);
    await showHUD("Failed to process clipboard content");
  }
}
