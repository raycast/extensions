import { homedir } from "node:os";
import { getPreferenceValues } from "@raycast/api";
import { runAppleScript, showFailureToast } from "@raycast/utils";

const script = `
  on run argv
    set targetDirectory to item 1 of argv

    tell application "Finder"
      set targetFolder to (POSIX file targetDirectory) as alias
      make new Finder window to targetFolder
      activate
    end tell
  end run
`;

function expandHomePath(value: string): string {
  return value.replace(/^~(?=\/|$)/, homedir());
}

export default async function Command() {
  const { directory } = getPreferenceValues<Preferences.NewFinderWindow>();

  try {
    await runAppleScript(script, [expandHomePath(directory)]);
  } catch (error) {
    await showFailureToast(error, { title: "Could Not Open Finder Window" });
  }
}
