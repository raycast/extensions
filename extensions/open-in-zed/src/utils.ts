import { runAppleScript } from "@raycast/utils";

export const getSelectedFinderWindow = async (): Promise<string> => {
  const appleScript = `
  if application "Finder" is running and frontmost of application "Finder" then
    tell app "Finder"
      set finderWindow to window 1
      set finderWindowPath to (POSIX path of (target of finderWindow as alias))
      return finderWindowPath
    end tell
  else 
    error "Could not get the selected Finder window"
  end if
 `;

  try {
    const result = await runAppleScript(appleScript);
    return result.trim();
  } catch {
    throw new Error("Could not get the selected Finder window");
  }
};
