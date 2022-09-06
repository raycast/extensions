import { closeMainWindow, Clipboard } from "@raycast/api";
import { runAppleScript } from "run-applescript";

export default async function main() {
  // Get lines of text from the clipboard
  const text = await Clipboard.readText();
  const lines = text?.split("\n");
  const clipboard_lines = lines?.map(
    (line: string) => '"' + line.replaceAll("\\", "\\\\").replaceAll('"', '\\"') + '"'
  );

  // Close the Raycast window
  await closeMainWindow();

  // Run script
  await runAppleScript(`tell application "Bike"
    -- Get the most recent document
    set theDoc to document 0

    -- Get lines of clipboard content
    set docData to {${clipboard_lines}}

    -- Add the clipboard content to the beginning of the document
    repeat with lineItem in docData
      tell theDoc to make new row with properties {name: lineItem}
    end repeat
  end tell`);
}
