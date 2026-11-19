import { closeMainWindow, showHUD } from "@raycast/api";
import { runAppleScript } from "run-applescript";

// Finds Chrome's "Add Tab to New Split View" menu item by its key equivalent (Option + Command + N)
// and clicks it. Menu items are not sent as keystrokes, so global shortcuts such as Arc's
// Little Arc (Option + Command + N) cannot intercept the action, and the lookup does not depend on
// the menu title, so it works in any Chrome language.
const CLICK_SPLIT_VIEW_MENU_ITEM = `
  tell application "Google Chrome" to activate
  tell application "System Events"
    tell process "Google Chrome"
      repeat with menuBarItem in menu bar items of menu bar 1
        repeat with menuItem in menu items of menu 1 of menuBarItem
          try
            if (value of attribute "AXMenuItemCmdChar" of menuItem) is "N" and (value of attribute "AXMenuItemCmdModifiers" of menuItem) is 2 then
              click menuItem
              return "clicked"
            end if
          end try
        end repeat
      end repeat
      return "not found"
    end tell
  end tell
`;

export default async function Command() {
  try {
    await closeMainWindow();
    const result = await runAppleScript(CLICK_SPLIT_VIEW_MENU_ITEM);
    if (result.trim() !== "clicked") {
      await showHUD("❌ Could not find the split view item in Google Chrome's menu");
    }
  } catch {
    await showHUD("❌ Failed to add tab to a new split view in Google Chrome");
  }
}
