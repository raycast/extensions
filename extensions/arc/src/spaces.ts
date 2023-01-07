import { PromiseOptions, useCachedPromise } from "@raycast/utils";
import { runAppleScript } from "run-applescript";
import { Space } from "./types";

// Spaces

export async function createTabWithinSpace(url: string, spaceId: string) {
  await runAppleScript(`
    tell application "Arc"
      tell front window      
        tell space ${spaceId}
          make new tab with properties {URL:"${url}"}
        end tell
      end tell

      activate
    end tell
  `);
}

export async function focusSpace(spaceId: string) {
  await runAppleScript(`
    tell application "Arc"
      tell front window
        tell space ${spaceId} to focus
      end tell
      
      activate
    end tell
  `);
}

export async function getSpaces() {
  const output = await runAppleScript(`
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

  const spaces = JSON.parse(output);
  return spaces as Space[];
}

export function useSpaces(options: PromiseOptions<() => Promise<Space[]>> = {}) {
  return useCachedPromise(getSpaces, [], options);
}
