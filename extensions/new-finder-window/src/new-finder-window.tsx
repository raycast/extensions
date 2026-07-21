import { getPreferenceValues } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

interface Preferences {
  directory: string;
}

function escapeAppleScriptString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export default async function Command() {
  const { directory } = getPreferenceValues<Preferences>();

  if (!directory) {
    throw new Error("Please configure a Finder directory first.");
  }

  const escapedDirectory = escapeAppleScriptString(directory);

  const script = `
    tell application "Finder"
      set targetFolder to (POSIX file "${escapedDirectory}") as alias
      make new Finder window to targetFolder
      activate
    end tell
  `;

  await runAppleScript(script);
}
