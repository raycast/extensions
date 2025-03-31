import { runAppleScript } from "@raycast/utils";

export default async function launchRuntime() {
  // for some reason this seems to error even if PiecesOS is installed, not sure exactly why, so we will default to polling for connection each time.
  return await runAppleScript(
    'tell application "PiecesOS" to activate\n',
  ).catch(() => null);
}
