import { runAppleScript } from "@raycast/utils";

export default async function launchRuntime() {
  return await runAppleScript(
    'tell application "Pieces OS" to activate\n',
  ).catch(() => null);
}
