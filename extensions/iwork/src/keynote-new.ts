import { showHUD } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import { checkKeynoteInstalled } from "./index";

export default async function main() {
  // Check for Keynote app
  const installed = await checkKeynoteInstalled();

  if (installed) {
    await runAppleScript(`tell application "Keynote"
      activate  
      make new document
    end tell`);
    showHUD("Created new Keynote slideshow");
  }
}
