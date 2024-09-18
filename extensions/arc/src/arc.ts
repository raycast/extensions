import { runAppleScript } from "@raycast/utils";
import { Space, Tab } from "./types";
import { findSpaceInSpaces } from "./utils";

// Tabs
export async function getTabs() {
  const response = await runAppleScript(`
    on escape_value(this_text)
      set AppleScript's text item delimiters to "\\\\"
      set the item_list to every text item of this_text
      set AppleScript's text item delimiters to "\\\\\\\\"
      set this_text to the item_list as string
      set AppleScript's text item delimiters to "\\""
      set the item_list to every text item of this_text
      set AppleScript's text item delimiters to "\\\\\\""
      set this_text to the item_list as string
      set AppleScript's text item delimiters to ""
      return this_text
    end escape_value

    set _output to ""

    tell application "Arc"
      if (count of windows) is 0 then
        make new window
      end if

      tell first window
        set allTabs to properties of every tab
      end tell
      set tabsCount to count of allTabs
      repeat with i from 1 to tabsCount
        set _tab to item i of allTabs
        set _title to my escape_value(get title of _tab)
        set _url to get URL of _tab
        set _id to get id of _tab
        set _location to get location of _tab
          
        set _output to (_output & "{ \\"title\\": \\"" & _title & "\\", \\"url\\": \\"" & _url & "\\", \\"id\\": \\"" & _id & "\\", \\"location\\": \\"" & _location & "\\" }")
        
        if i < tabsCount then
          set _output to (_output & ",\\n")
        else
          set _output to (_output & "\\n")
        end if

      end repeat
    end tell
    
    return "[\\n" & _output & "\\n]"
  `);

  return response ? (JSON.parse(response) as Tab[]) : undefined;
}

export async function findTab(url: string) {
  const response = await runAppleScript(`
  on escape_value(this_text)
    set AppleScript's text item delimiters to "\\""
    set the item_list to every text item of this_text
    set AppleScript's text item delimiters to "\\\\\\""
    set this_text to the item_list as string
    set AppleScript's text item delimiters to ""
    return this_text
  end replace_chars

    set _output to ""

    tell application "Arc"
      set _window_index to 1

      repeat with _window in windows
          set _tab_index to 1
          
          repeat with _tab in tabs of _window
            set _url to get URL of _tab

            if _url is equal "${url}" then
              set _title to my escape_value(get title of _tab)
              set _location to get location of _tab
          
              set _output to (_output & "{ \\"title\\": \\"" & _title & "\\", \\"url\\": \\"" & _url & "\\", \\"windowId\\": " & _window_index & ", \\"tabId\\": " & _tab_index & " , \\"location\\": \\"" & _location & "\\" }")
                        
              return _output
            end if

            set _tab_index to _tab_index + 1
          end repeat
          
          set _window_index to _window_index + 1
      end repeat
    end tell

    return _output
  `);

  return response ? (JSON.parse(response) as Tab) : undefined;
}

function runAppleScriptActionOnTab(tab: Tab, action: string, activate = false) {
  return runAppleScript(`
    tell application "Arc"
    if (count of windows) is 0 then
    make new window
  end if
      set tabIndex to 1
      repeat with aTab in every tab of first window
        if id of aTab is "${tab.id}" then
          tell tab tabIndex of window 1 to ${action}
          ${activate ? "activate" : ""}
          return tabIndex
        end if
        set tabIndex to tabIndex + 1
      end repeat
    end tell
  `);
}

export async function selectTab(tab: Tab) {
  await runAppleScriptActionOnTab(tab, "select", true);
}

export async function closeTab(tab: Tab) {
  await runAppleScriptActionOnTab(tab, "close");
}

export async function reloadTab(tab: Tab) {
  await runAppleScriptActionOnTab(tab, "reload");
}

export async function makeNewTab(url: string, space?: string) {
  await runAppleScript(`
    tell application "Arc"
      if (count of windows) is 0 then
        make new window
      end if

      tell front window
        ${space ? `tell space "${space}" to focus` : ""}
        make new tab with properties {URL:"${url}"}
      end tell

      activate
    end tell
  `);
}

export async function getValidatedSpaceTitle(spaceId: string | undefined) {
  if (spaceId) {
    const spaces = await getSpaces();
    if (spaces) {
      return findSpaceInSpaces(spaceId, spaces);
    }
  }

  return undefined;
}

// Windows
export type MakeNewWindowOptions = {
  incognito?: boolean;
  url?: string;
  space?: string;
};

export async function makeNewWindow(options: MakeNewWindowOptions = {}): Promise<void> {
  await runAppleScript(`
    tell application "Arc"
      make new window with properties {incognito:${options.incognito ?? false}}
      activate

      ${options.space ? `tell front window to tell space "${options.space}" to focus` : ""}
      ${options.url ? `tell front window to make new tab with properties {URL:"${options.url}"}` : ""}
    end tell
  `);
}

export async function makeNewBlankWindow(): Promise<void> {
  await runAppleScript(`
    tell application "Arc"
      activate
    end tell
    delay(0.5)
    tell application "Arc"
      activate
    end tell

    tell application "System Events"
      tell process "Arc"
        click menu item "Blank window" of menu "File" of menu bar 1
      end tell
    end tell
  `);
}

export async function makeNewLittleArcWindow(url: string) {
  await runAppleScript(`
    tell application "Arc"
      make new tab with properties {URL:"${url}"}
      activate
    end tell
  `);
}

// Spaces
export async function makeNewTabWithinSpace(url: string, space: Space) {
  await runAppleScript(`
    tell application "Arc"
      tell front window      
        tell space ${space.id}
          make new tab with properties {URL:"${url}"}
        end tell
      end tell

      activate
    end tell
  `);
}

export async function selectSpace(space: Space) {
  await runAppleScript(`
    tell application "Arc"
      tell front window
        tell space ${space.id} to focus
      end tell
      
      activate
    end tell
  `);
}

export async function getSpaces() {
  const response = await runAppleScript(`
    set _output to ""

    tell application "Arc"
      if (count of windows) is 0 then
        make new window
      end if
      set _space_index to 1
      
      repeat with _space in spaces of front window
        set _title to get title of _space
        
        set _output to (_output & "{ \\"title\\": \\"" & _title & "\\", \\"id\\": " & _space_index & " }")
        
        if _space_index < (count spaces of front window) then
          set _output to (_output & ",\\n")
        else
          set _output to (_output & "\\n")
        end if
        
        set _space_index to _space_index + 1
      end repeat
    end tell
    
    return "[\\n" & _output & "\\n]"
  `);

  return response ? (JSON.parse(response) as Space[]) : undefined;
}

// Utils
export async function getVersion() {
  const response = await runAppleScript(`
    tell application "Arc"
      return version
    end tell
  `);

  return response;
}
