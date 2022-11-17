import { closeMainWindow, getPreferenceValues } from "@raycast/api";
import { runAppleScript } from "run-applescript";

export default async function Command() {
  const { alsoHideRaycast } = getPreferenceValues();

  if (alsoHideRaycast) {
    await closeMainWindow();
  }

  // https://gist.github.com/Teraflopst/e1863cfff5f0deb46ec2cabe9984305b
  await runAppleScript(`
tell application "Finder"
    set visible of every process whose visible is true and name is not "Finder" to false
    set the collapsed of windows to true
end tell
  `);
}
