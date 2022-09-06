import { closeMainWindow, Clipboard } from "@raycast/api";
import { runAppleScript } from "run-applescript";

export default async function main() {
  // Get lines of text from the clipboard
  const text = await Clipboard.readText();
  const lines = text?.split("\n").reverse();
  const clipboard_lines = lines?.map(
    (line: string) => '"' + line.replaceAll("\\", "\\\\").replaceAll('"', '\\"') + '"'
  );

  // Close the Raycast window
  await closeMainWindow();

  // Run script
  await runAppleScript(`tell application "Bike"
    set newDoc to make new document
    
    try
      -- Attempt to delete every row (only works with license)
      tell newDoc to delete every row
    on error
      -- No license, just clear every row
      repeat with rowItem in rows of newDoc
        set name of rowItem to ""
      end repeat
    end try

    -- Get lines of clipboard content
    set docData to {${clipboard_lines}}

    -- Add the clipboard content to the beginning of the document
    repeat with lineItem in docData
      tell newDoc to make new row at front of rows with properties {name: lineItem}
    end repeat
  end tell`);
}
