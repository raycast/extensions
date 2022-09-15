import { useState } from "react";
import { showHUD, popToRoot } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import { checkKeynoteInstalled } from "./index";

export default function Main() {
  const [ranScript, setRanScript] = useState<boolean>(false);

  // Check for Keynote app
  const error_alert = checkKeynoteInstalled();
  if (error_alert !== undefined) {
    return error_alert;
  } else if (!ranScript) {
    setRanScript(true);

    // Stop the current slideshow
    showHUD(`Stopping new Keynote...`);
    Promise.resolve(
      runAppleScript(`tell application "Keynote"
          stop slideshow
      end tell`)
    );
    Promise.resolve(popToRoot());
  }
}
