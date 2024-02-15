import { runAppleScript } from "@raycast/utils";

export function launchVSCode(path: string) {
  const script = `tell application "Visual Studio Code" to open "${path}"`;
  return runAppleScript(script);
}
