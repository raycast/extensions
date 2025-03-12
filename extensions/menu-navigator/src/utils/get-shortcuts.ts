import { Application } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { parseAppleScriptResponse } from "./parser";
import {
  getFileNameForCache,
  readFileCache,
  writeFileCache,
} from "./files-cache";

/*
 * Get total number of application menu bar items
 */
export async function getTotalMenuBarItemsApplescript(app: Application) {
  const result = await runAppleScript(`
    tell application "System Events"
      tell process "${app.name}"
        set menuCount to count of menu bar items of menu bar 1
        
        -- To get total menu items including submenus
        set totalItems to 0
        repeat with i from 1 to menuCount
          set totalItems to totalItems + (count of menu items of menu of menu bar item i of menu bar 1)
        end repeat
      end tell
    end tell
  `);

  return parseInt(result, 10);
}

/*
 * Load menu bar shortcuts for app from the local cache
 */
export async function getMenuBarShortcutsCache(app: Application) {
  try {
    const data = await readFileCache(getFileNameForCache(app));
    return data;
  } catch {
    throw new Error("Could not load local shortcuts");
  }
}

/*
 * Load menu bar shortcuts for app using AppleScript
 * Retrieves shortcuts from AppleScript, parses them and saves to local cache
 */
export async function getMenuBarShortcutsApplescript(
  app: Application,
  totalMenuItems: number = 0,
) {
  try {
    // Calculate timeout based on total menu items (1 second per item)
    // Minimum timeout of 1 minute, maximum of 10 minutes
    const timeout = Math.min(Math.max(totalMenuItems * 1000, 60000), 600000);

    const response = await runAppleScript(getMenuBarItemsApplescript(app), {
      timeout,
    });
    if (!response?.includes("|MN:")) {
      throw new Error("Invalid shortcuts response");
    }

    const parsed = parseAppleScriptResponse(app, response);
    await writeFileCache(getFileNameForCache(app), parsed);
    return parsed;
  } catch (e) {
    throw new Error("Could not load shortcuts");
  }
}

/*
 * AppleScript to get menu bar items and shortcuts
 */
const getMenuBarItemsApplescript = (app: Application) => {
  return `
    -- Convert a list of menu shortcut records to a delimited string with section grouping
    on convertRecordsToString(recordsList)
        -- Initialize empty strings for building the result
        set resultString to ""
        set currentSection to ""
        
        repeat with recordItem in recordsList
            -- Get all required fields from the record
            set {menuPath, shortcutName, shortcutModifiers, shortcutKey, shortcutGlyph, isSectionTitle} to ¬
                {menuPath of recordItem, shortcutName of recordItem, ¬
                shortcutModifiers of recordItem, shortcutKey of recordItem, shortcutGlyph of recordItem, ¬
                isSectionTitle of recordItem}
            
            -- Update current section if this is a section title
            if isSectionTitle then set currentSection to shortcutName
            
            -- Build the record string with field delimiters
            set recordString to "|MN:MP:" & menuPath & ¬
                ":SN:" & shortcutName & ¬
                ":SM:" & shortcutModifiers & ¬
                ":SK:" & shortcutKey & ¬
                ":SG:" & shortcutGlyph & ¬
                ":ST:" & isSectionTitle & ¬
                ":SEC:" & currentSection
            
            -- Append the record to the result string
            set resultString to resultString & recordString
        end repeat
        
        return resultString
    end convertRecordsToString


    -- Check if a menu item name is valid
    on isValidMenuItemName(itemName)
      return (itemName is not "" and itemName is not missing value)
    end isValidMenuItemName


    -- Run script to get all menu items
    on run
      set allShortcuts to {}
      
      tell application "System Events"
        -- Use the passed application name
        set appName to "${app.name}"
        
        try
          -- Get the application process directly by name
          set targetApp to application process appName
          
          set menuBar to menu bar 1 of targetApp
          
          repeat with menuBarItem in menu bar items of menuBar
            set menuName to name of menuBarItem
            
            try
              set menuItems to menu items of menu 1 of menuBarItem
              -- Process top-level menu items
              repeat with menuItem in menuItems
                try
                  set itemName to name of menuItem
                  if my isValidMenuItemName(itemName) then
                    set currentPath to menuName & ">" & itemName
                    
                    -- Check if item is a section title (integrated directly here)
                    set isTitle to false
                    try
                      set menuRole to value of attribute "AXRole" of menuItem
                      set menuSubrole to value of attribute "AXSubrole" of menuItem
                      set enabled to value of attribute "AXEnabled" of menuItem
                      set identifier to ""
                      try
                          set identifier to value of attribute "AXIdentifier" of menuItem
                      end try
                      
                      if menuRole is equal to "AXMenuItemTitle" or ¬
                        menuSubrole is equal to "AXHeaderItem" or ¬
                        identifier is equal to "" or ¬
                        itemName ends with ":" then
                        set isTitle to true
                      end if
                    end try
                    
                    -- Check if the menu item has a submenu and process submenu items
                    if exists menu 1 of menuItem then
                      set subMenuItems to menu items of menu 1 of menuItem
                      repeat with subMenuItem in subMenuItems
                        try
                          set subItemName to name of subMenuItem
                          if my isValidMenuItemName(subItemName) then
                            set subPath to currentPath & ">" & subItemName
                            
                            -- Check if submenu item is a section title
                            set isSubTitle to false
                            try
                              set subMenuRole to value of attribute "AXRole" of subMenuItem
                              set subMenuSubrole to value of attribute "AXSubrole" of subMenuItem
                              set subEnabled to value of attribute "AXEnabled" of subMenuItem
                              set subIdentifier to ""
                              try
                                  set subIdentifier to value of attribute "AXIdentifier" of subMenuItem
                              end try
                              
                              if subMenuRole is equal to "AXMenuItemTitle" or ¬
                                subMenuSubrole is equal to "AXHeaderItem" or ¬
                                subIdentifier is equal to "" or ¬
                                subItemName ends with ":" then
                                set isSubTitle to true
                              end if
                            end try
                            
                            -- These AXMenuItem* commands must stay in the run handler
                            try
                              set shortcutModifiers to value of attribute "AXMenuItemCmdModifiers" of subMenuItem
                              set shortcutKey to value of attribute "AXMenuItemCmdChar" of subMenuItem
                              set shortcutGlyph to value of attribute "AXMenuItemCmdGlyph" of subMenuItem

                              if shortcutModifiers is missing value then set shortcutModifiers to "null"
                              if shortcutKey is missing value then set shortcutKey to "null"
                              if shortcutGlyph is missing value then set shortcutGlyph to "null"
                            end try
                            
                            set menuItemInfo to {menuPath:subPath, shortcutName:subItemName, shortcutModifiers:shortcutModifiers, shortcutKey:shortcutKey, shortcutGlyph:shortcutGlyph, isSectionTitle:isSubTitle}
                            set end of allShortcuts to menuItemInfo
                          end if
                        end try
                      end repeat

                    -- Process regular menu item (AXMenuItem* commands must stay here)
                    else
                      try
                        set shortcutKey to value of attribute "AXMenuItemCmdChar" of menuItem
                        set shortcutGlyph to value of attribute "AXMenuItemCmdGlyph" of menuItem
                        set shortcutModifiers to value of attribute "AXMenuItemCmdModifiers" of menuItem

                        if shortcutModifiers is missing value then set shortcutModifiers to "null"
                        if shortcutKey is missing value then set shortcutKey to "null"
                        if shortcutGlyph is missing value then set shortcutGlyph to "null"
                      end try
                      
                      set menuItemInfo to {menuPath:currentPath, shortcutName:itemName, shortcutModifiers:shortcutModifiers, shortcutKey:shortcutKey, shortcutGlyph:shortcutGlyph, isSectionTitle:isTitle}
                      set end of allShortcuts to menuItemInfo
                    end if
                  end if
                end try
              end repeat
            end try
          end repeat
        end try
      end tell
      
      return my convertRecordsToString(allShortcuts)
    end run
  `;
};
