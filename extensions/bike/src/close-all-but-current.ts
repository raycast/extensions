import { useState } from "react";
import { popToRoot, showHUD } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import checkBikeInstalled from "./index";

export default function main() {
  const [ranScript, setRanScript] = useState<boolean>(false);

  const error_alert = checkBikeInstalled();
  if (error_alert !== undefined) {
    return error_alert;
  } else if (!ranScript) {
    setRanScript(true);

    // Run script
    Promise.resolve(
      runAppleScript(`tell application "Bike"
      activate
      set docZero to document 1
      set theCount to (count of documents)
      repeat while theCount is greater than 1
        try
          close last document saving ask
        end try
        set theCount to (theCount - 1)
      end repeat
    end tell`)
    );

    showHUD("Closed other Bikes");

    // Close the Raycast window
    Promise.resolve(popToRoot());
  }
}
