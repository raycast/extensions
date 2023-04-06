import { Clipboard, showHUD } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import { checkPagesInstalled } from "./index";

export default async function Main() {
  // Check for Pages app
  const installed = await checkPagesInstalled();
  if (installed) {
    const clipboardText = await Clipboard.readText();
    const text = clipboardText?.replaceAll('"', '\\"');
    await runAppleScript(`tell application "Pages"
            make new document with properties {body text: "${text}"}
        end tell`);
    showHUD("Creating new Pages document from clipboard text...");
  }
}
