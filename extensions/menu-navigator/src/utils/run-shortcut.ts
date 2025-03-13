import { runAppleScript, showFailureToast } from "@raycast/utils";
import { MenuItem } from "../types";

/*
 * Script to run top level menu item shortcut
 */
function menuItemScript(appName: string, item: MenuItem) {
  return `
    tell application "${appName}"
        activate
    end tell

    tell application "System Events"
      tell process "${appName}"
        tell menu bar 1
          tell menu "${item.menu}"
            click menu item "${item.shortcut}"
          end tell
        end tell
      end tell
    end tell
  `;
}

/*
 * Script to run submenu item shortcuts
 */
function subMenuItemScript(appName: string, item: MenuItem) {
  return `
    -- Helper function to split text by delimiter
    on splitText(theText, theDelimiter)
        set AppleScript's text item delimiters to theDelimiter
        set theTextItems to every text item of theText
        set AppleScript's text item delimiters to ""
        return theTextItems
    end splitText

    -- Split the path into components
    set menuItems to splitText("${item.path}", ">")
    
    tell application "${appName}"
        activate
    end tell
    
    tell application "System Events"
        tell process "${appName}"
            tell menu bar 1
              tell menu bar item (first item of menuItems)
                set currentMenu to menu 1
                
                -- Loop through the remaining menu items to navigate submenus
                repeat with i from 2 to (count of menuItems)
                    set currentMenuItem to item i of menuItems
                    
                    -- If this is the last item, click it
                    if i is equal to (count of menuItems) then
                        click menu item currentMenuItem of currentMenu
                    else
                        -- Otherwise, get its submenu
                        set currentMenu to menu 1 of menu item currentMenuItem of currentMenu
                    end if
                end repeat
              end tell
            end tell
        end tell
    end tell
  `;
}

/*
 * Runs Applescript function to trigger shortcut based on item data provided
 */
export async function runShortcut(appName: string, item: MenuItem) {
  try {
    const isSubmenu = item.path?.split(">").length > 2;
    const runItem = isSubmenu ? subMenuItemScript : menuItemScript;
    const response = await runAppleScript(runItem(appName, item));
    return response;
  } catch (e) {
    showFailureToast("Error running shortcut");
    return false;
  }
}
