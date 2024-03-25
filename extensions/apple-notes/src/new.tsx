import { closeMainWindow, getSelectedText, LaunchProps, showToast, Toast } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { escapeDoubleQuotes } from "./utils";

export default async (props: LaunchProps<{ arguments: Arguments.New }>) => {
  await closeMainWindow();

  let text = "";
  try {
    text = await getSelectedText();
  } catch {
    // fails silently
  }

  if (props.fallbackText) {
    text = props.fallbackText;
  }

  if (props.arguments.text) {
    text = props.arguments.text;
  }

  try {
    const script = text.trim()
      ? `
    set noteContent to "${escapeDoubleQuotes(text)}"
    tell application "Notes"
      activate
      set newNote to make new note at folder "Notes"
      set body of newNote to noteContent
      set selection to newNote
    end tell
    `
      : `
    tell application "Notes"
      activate
      make new note at folder "Notes"
    end tell
    `;

    await runAppleScript(script);
  } catch (error) {
    showToast({ style: Toast.Style.Failure, title: "Could not create a new note." });
  }
};
