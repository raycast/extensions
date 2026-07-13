import { runAppleScript } from "@raycast/utils";
import { getAdbPath } from "./adb";

export async function openTerminalWithCommand(command: string) {
  const adbPath = getAdbPath();

  // Try to use full path if just "adb" is provided and we can find it
  let finalCommand = command;
  if (finalCommand.startsWith("adb ")) {
    finalCommand = finalCommand.replace(/^adb /, `${adbPath} `);
  }

  // AppleScript to open Terminal and run the command
  const script = `
    tell application "Terminal"
      activate
      do script "${finalCommand.replace(/"/g, '\\"')}"
    end tell
  `;

  await runAppleScript(script);
}
