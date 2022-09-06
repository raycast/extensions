import { closeMainWindow } from "@raycast/api";
import { runAppleScript } from "run-applescript";

export default async function main() {
  // Close the Raycast window
  await closeMainWindow();

  // Run script
  await runAppleScript(`tell application "Bike"
    set docZero to document 0
    repeat while (count of documents) is greater than 1
      try
        close last document saving no
      end try
    end repeat
  end tell`);
}
