import { runAppleScript } from "run-applescript";
import { Space, Tab } from "./types";

// Tabs

export async function getTabs() {
  const response = await runAppleScript(`
    on escape_value(this_text)
      set AppleScript's text item delimiters to the "\\""
      set the item_list to every text item of this_text
      set AppleScript's text item delimiters to the "\\\\\\""
      set this_text to the item_list as string
      set AppleScript's text item delimiters to ""
      return this_text
    end replace_chars

    set _output to ""

    tell application "Arc"
      set _window_index to 1
      set _tab_index to 1
      
      repeat with _tab in tabs of first window
        set _title to my escape_value(get title of _tab)
        set _url to get URL of _tab
        set _location to get location of _tab
        
        set _output to (_output & "{ \\"title\\": \\"" & _title & "\\", \\"url\\": \\"" & _url & "\\", \\"windowId\\": " & _window_index & ", \\"tabId\\": " & _tab_index & " , \\"location\\": \\"" & _location & "\\" }")
        
        if _tab_index < (count tabs of first window) then
          set _output to (_output & ",\\n")
        else
          set _output to (_output & "\\n")
        end if
        
        set _tab_index to _tab_index + 1
      end repeat
    end tell
    
    return "[\\n" & _output & "\\n]"
  `);

  return response ? (JSON.parse(response) as Tab[]) : undefined;
}

export async function findTab(url: string) {
  const response = await runAppleScript(`
  on escape_value(this_text)
    set AppleScript's text item delimiters to the "\\""
    set the item_list to every text item of this_text
    set AppleScript's text item delimiters to the "\\\\\\""
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

export async function selectTab(tab: Tab) {
  await runAppleScript(`
    tell application "Arc"
      tell window (${tab.windowId} as number)
        tell tab (${tab.tabId} as number) to select
      end tell

      activate
    end tell
  `);
}

export async function closeTab(tab: Tab) {
  await runAppleScript(`
    tell application "Arc"
      tell window (${tab.windowId} as number)
        tell tab (${tab.tabId} as number) to close
      end tell
    end tell
  `);
}

export async function reloadTab(tab: Tab) {
  await runAppleScript(`
    tell application "Arc"
      tell window (${tab.windowId} as number)
        tell tab (${tab.tabId} as number) to reload
      end tell
    end tell
  `);
}

export async function makeNewTab(url: string) {
  await runAppleScript(`
    tell application "Arc"
      tell front window
        make new tab with properties {URL:"${url}"}
      end tell

      activate
    end tell
  `);
}

// Windows

export type MakeNewWindowOptions = {
  incognito?: boolean;
  url?: string;
};

export async function makeNewWindow(options: MakeNewWindowOptions = {}): Promise<void> {
  await runAppleScript(`
    tell application "Arc"
      make new window with properties {incognito:${options.incognito ?? false}}
      activate

      ${options.url ? `tell front window to make new tab with properties {URL:"${options.url}"}` : ""}
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
