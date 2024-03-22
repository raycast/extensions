import { getSelectedText, closeMainWindow, LaunchProps, showHUD } from "@raycast/api";
import { runAppleScriptSync } from "run-applescript";

function escapeDoubleQuotes(value: string) {
  return value.replace(/"/g, '\\"');
}

export default async (props: LaunchProps) => {
  await closeMainWindow();

  try {
    const selectedText = await getSelectedText();

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
    showHUD("❌ Unable to get selected text");
  }
};
