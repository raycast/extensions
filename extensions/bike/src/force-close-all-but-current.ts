import { useEffect } from "react";
import { popToRoot, showHUD } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import checkBikeInstalled from "./index";

export default function main() {
  const error_alert = checkBikeInstalled();
  if (error_alert !== undefined) {
    return error_alert;
  }

  useEffect(() => {
    runAppleScript(`tell application "Bike"
      activate
      set docZero to document 1
      repeat while (count of documents) is greater than 1
        try
          close last document saving no
        end try
      end repeat
    end tell`).then(() => showHUD("Closed Other Documents").then(() => Promise.resolve(popToRoot())))
  }, [])
}
