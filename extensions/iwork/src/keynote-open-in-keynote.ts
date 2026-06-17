import { runAppleScript } from "run-applescript";
import { checkKeynoteInstalled } from "./index";

export default async function Main() {
  // Check for Keynote app
  const installed = await checkKeynoteInstalled();

  if (installed) {
    // Open slideshow
    await runAppleScript(`tell application "Finder"
        set fileList to {}
        set selectedFiles to selection as alias list
        repeat with theFile in selectedFiles
            set end of fileList to theFile
        end repeat
    end tell

    tell application "Keynote"
        repeat with theFile in fileList
            open theFile
        end repeat
    end tell`);
  }
}
