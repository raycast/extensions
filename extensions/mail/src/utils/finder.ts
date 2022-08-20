import { runAppleScript } from "run-applescript";

export async function getFinderSelection(): Promise<string[]> {
  const script = `
    tell application "Finder"
      set theItems to selection
    end tell
    set itemsPaths to ""
    repeat with itemRef in theItems
      set theItem to POSIX path of (itemRef as string)
      set itemsPaths to itemsPaths & theItem & return
    end repeat
    return itemsPaths
  `;
  const response = await runAppleScript(script);
  return response === "" ? [] : response.split("\r");
}
