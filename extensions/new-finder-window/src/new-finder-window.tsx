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

export default async function Command() {
  const { directory } = getPreferenceValues<Preferences.NewFinderWindow>();

  try {
    await runAppleScript(script, [directory]);
  } catch (error) {
    await showFailureToast(error, { title: "Could Not Open Finder Window" });
  }
}
