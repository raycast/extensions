import { closeMainWindow } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import checkBikeInstalled from "./index";

export default function main() {
  const error_alert = checkBikeInstalled();
  if (error_alert !== undefined) {
    return error_alert;
  }

  // Close the Raycast window
  Promise.resolve(closeMainWindow());

  // Run script
  Promise.resolve(
    runAppleScript(`tell application "Bike"
    set docZero to document 0
    repeat while (count of documents) is greater than 1
      try
        close last document saving no
      end try
    end repeat
  end tell`)
  );
}
