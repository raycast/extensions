import { runAppleScript } from "run-applescript";
import { showHUD } from "@raycast/api";

export default async () => {
  const appleScript = `
    try
      tell application "Finder" to get application file id "com.microsoft.VSCode"
      set visualStudioCodeInstalled to true
    on error
        set visualStudioCodeInstalled to false
    end try
    
    if visualStudioCodeInstalled
      tell application "Finder" to set finderItemsList to (selection as alias list)   
      if ((count of finderItemsList) = 0 ) then
        tell application "Finder"
          if exists Finder window 1 then
              set currentFinderPath to target of Finder window 1 as alias
          else
              return "No Finder Window Opened"
          end if
        end tell
      else
        set currentFinderPath to item 1 of finderItemsList
      end if
      tell application "Visual Studio Code" to open currentFinderPath
      return "Opening Visual Studio Code"
    else 
      return "Visual Studio Code Not Installed"
    end if   
  `;

  try {
    const result = await runAppleScript(appleScript);
    await showHUD(result);
  } catch (err) {
    await showHUD("Error");
  }
};
