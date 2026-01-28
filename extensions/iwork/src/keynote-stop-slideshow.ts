import { showHUD } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import { checkKeynoteInstalled } from "./index";

export default async function Main() {
  // Check for Keynote app
  const installed = await checkKeynoteInstalled();
  if (installed) {
    showHUD(`Stopping new Keynote...`);

    // Stops the current slideshow
    const error = await runAppleScript(`tell application "Keynote"
        try
          stop slideshow
        on error
          return 1
        end try
      end tell`);

    if (error) {
      showHUD("No slideshow to stop!");
    }
  }
}
