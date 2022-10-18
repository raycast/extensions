import { runAppleScript } from "run-applescript";
import { checkPagesInstalled } from "./index";

export default async function Main() {
  // Check for Pages app
  const installed = await checkPagesInstalled();
  if (installed) {
    // Open document
    await runAppleScript(`tell application "Finder"
        set fileList to {}
        set selectedFiles to selection as alias list
        repeat with theFile in selectedFiles
            set end of fileList to theFile
        end repeat
    end tell

    tell application "Pages"
        repeat with theFile in fileList
            open theFile
        end repeat
    end tell`);
  }
}
