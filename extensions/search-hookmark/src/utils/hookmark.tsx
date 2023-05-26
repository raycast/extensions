import { runAppleScriptSync } from "run-applescript";
import { Bookmark } from "./type";
import fs from "fs";

export async function getBookmarks() {
  const response = runAppleScriptSync(`
    set _output to ""
  
    tell application "Hookmark"
      set _bookmark_name_list to name of every bookmark
      set _bookmark_addr_list to address of every bookmark
      set _bookmark_path_list to path of every bookmark
  
      set _bookmark_count to count of _bookmark_name_list
      
      repeat with i from 1 to _bookmark_count
        set _name to item i of _bookmark_name_list
        set _address to item i of _bookmark_addr_list
        set _path to item i of _bookmark_path_list
        
        set _output to (_output & "{\\"title\\": \\"" & _name & "\\", \\"address\\": \\"" & _address & "\\", \\"path\\": \\"" & _path & "\\" }")
        
        if i < _bookmark_count then
          set _output to (_output & ",\\n")
        else
          set _output to (_output & "\\n")
        end if
      end repeat
    end tell
    
    return "[\\n" & _output & "\\n]" 
    `);
  return response ? (JSON.parse(response) as Bookmark[]) : undefined;
}

export function openInHook(name: string, address: string) {
  const script = `
    tell application "Hookmark"
      invoke on (make bookmark with properties {name:"${name}", address:"${address}"})
    end tell
  `;
  runAppleScriptSync(script);
  // console.log(`Bookmark added to Hook: ${name} (${address})`);
}

export function getHookIconPath() {
  const HookPath = "/System/Volumes/Data/Applications/Hookmark.app";
  const HookPathSetapp = "/System/Volumes/Data/Applications/Setapp/Hookmark.app";
  let iconPath = "";
  if (fs.existsSync(HookPath)) {
    iconPath = HookPath;
    // console.log(`iconPath is ${iconPath}`);
  }

  if (fs.existsSync(HookPathSetapp)) {
    iconPath = HookPathSetapp;
    // console.log(`iconPath is ${iconPath}`);
  }
  return iconPath;
}
