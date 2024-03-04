import { getSelectedText, Clipboard, closeMainWindow, LaunchProps, showHUD } from "@raycast/api";
import { runAppleScriptSync } from "run-applescript";
import { setTimeout } from "timers/promises";
import { testPermissionErrorType, showPermissionErrorHUD } from "./errors";

export default async (props: LaunchProps) => {
  let currentClipboardContent: string | undefined;

  await closeMainWindow();

  try {
    const selectedText = await getSelectedText();

    function escapeDoubleQuotes(value: string) {
      return value.replace(/"/g, '\\"');
    }
  
    const escapedSelectedText = escapeDoubleQuotes(selectedText);

    runAppleScriptSync(`
    set noteContent to "${escapedSelectedText}"
	  tell application "Notes"
		activate
		set newNote to make new note at folder "Notes"
		set body of newNote to noteContent
		set selection to newNote
    end tell
  `);
  } catch (error) {
    console.log(error)
    if (error.message.includes("get selected text")) {
      showHUD("❌ Selected text is not available");
    }
    else {
    showPermissionErrorHUD(testPermissionErrorType(error));
    }
  }

  // Simply give it a break before restoring the clipboard
  await setTimeout(200);
  Clipboard.copy(currentClipboardContent ?? "");
};
