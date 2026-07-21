import { getPreferenceValues } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

interface Preferences {
  directory: string;
}

export default async function Command() {
  const { directory } = getPreferenceValues<Preferences>();

  const script = `
    tell application "Finder"
      set targetFolder to (POSIX file "${directory}") as alias
      make new Finder window to targetFolder
      activate
    end tell
  `;

  await runAppleScript(script);
}
