import { runAppleScript } from "run-applescript";
import { checkNumbersInstalled } from "./index";

export default async function Main() {
  // Check for Numbers app
  const installed = await checkNumbersInstalled();
  if (installed) {
    // Open spreadsheet
    await runAppleScript(`tell application "Finder"
        set fileList to {}
        set selectedFiles to selection as alias list
        repeat with theFile in selectedFiles
            set end of fileList to theFile
        end repeat
    end tell

    tell application "Numbers"
        repeat with theFile in fileList
            open theFile
        end repeat
    end tell`);
  }
}
