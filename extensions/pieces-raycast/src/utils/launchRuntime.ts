import { runAppleScript } from "@raycast/utils";

export default async function launchRuntime() {
  // for some reason this seems to error even if Pieces OS is installed, not sure exactly why, so we will default to polling for connection each time.
  return await runAppleScript(
    'tell application "Pieces OS" to activate\n',
  ).catch(() => null);
}
