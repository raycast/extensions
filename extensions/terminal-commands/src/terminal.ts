import { runAppleScript } from "@raycast/utils";

export async function runInTerminal(command: string) {
  await runAppleScript(
    `
    on run argv
      set command to item 1 of argv
      tell application "Terminal"
        if it is running then
          do script command
        else
          activate
          do script command in window 1
        end if
        activate
      end tell
    end run
    `,
    [command],
  );
}
