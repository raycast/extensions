import { useEffect } from "react";
import { Clipboard, popToRoot, showHUD } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import checkBikeInstalled from "./index";

export default function main() {
  const error_alert = checkBikeInstalled();
  if (error_alert !== undefined) {
    return error_alert;
  }

  useEffect(() => {
    // Get lines of text from the clipboard
    Clipboard.readText().then((text) => {
      const lines = text?.split("\n").reverse();
      const clipboard_lines = lines?.map(
        (line: string) => '"' + line.replaceAll("\\", "\\\\").replaceAll('"', '\\"') + '"'
      );

      // Run script
      runAppleScript(`tell application "Bike"
        activate
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
      end tell`).then(() => showHUD("Created New Bike Document").then(() => Promise.resolve(popToRoot())));
    });
  }, []);
}
