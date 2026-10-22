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
          -- The startup window can appear after activate returns; wait up to 5 seconds for it.
          repeat 50 times
            if (count of windows) > 0 then exit repeat
            delay 0.1
          end repeat
          if (count of windows) > 0 then
            do script command in window 1
          else
            do script command
          end if
        end if
        activate
      end tell
    end run
    `,
    [command],
    // No timeout: the first run waits on the macOS Automation permission prompt for Terminal.
    { timeout: 0 },
  );
}
