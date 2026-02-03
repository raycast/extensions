import { runAppleScript, showFailureToast } from "@raycast/utils";
import { tryit } from "radash";

export default async function main() {
  const script = /* applescript */ `
        tell application "System Events"
          -- 1. Get the frontmost process and click the Apple menu
          set frontProc to first process whose frontmost is true
          click menu bar item 1 of menu bar 1 of frontProc
          
          -- 2. Wait a bit for the menu to appear
          delay 0.3
          
          -- 3. Click the "Restart..." menu item
          -- Using fuzzy matching to handle both English and Chinese text, or different ellipsis characters
          click (first menu item of menu 1 of menu bar item 1 of menu bar 1 of frontProc ¬
            whose name starts with "Restart" or name starts with "重新启动")
          
          -- 4. Key step: Wait for the confirmation dialog to appear
          delay 0.5
          
          -- 5. Simulate pressing Enter to trigger the blue Restart button
          keystroke return
        end tell
  `;

  const [err] = await tryit(() => runAppleScript(script))();
  if (err) {
    showFailureToast(err.message);
  }
}
