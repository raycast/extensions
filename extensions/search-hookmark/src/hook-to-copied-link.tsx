import { runAppleScriptSync } from "run-applescript";
import { showHUD } from "@raycast/api";

export default async function Command() {
  const response = runAppleScriptSync(`
  tell application "Hookmark"
        set currentBookmark to bookmark from active window
        set targetURL to the clipboard as text
        set targetBookmark to bookmark id targetURL
        hook currentBookmark and targetBookmark
  end tell     
    `);

  await showHUD(`🎉 Hook Successfully`);
}
