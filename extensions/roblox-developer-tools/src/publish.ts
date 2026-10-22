import { closeMainWindow } from "@raycast/api";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { run } from "./utils";

const exec = promisify(execFile);

export default async function Command() {
  await closeMainWindow();

  await run("Publishing...", async () => {
    try {
      const { stdout } = await exec(
        "/usr/bin/osascript",
        [
          "-e",
          `
        tell application "System Events"
          set studioProcesses to every application process whose bundle identifier is "com.Roblox.RobloxStudio"
          if (count of studioProcesses) is 0 then return "not-running"
          set targetProcess to missing value
          repeat with studioProcess in studioProcesses
            if frontmost of studioProcess then
              set targetProcess to contents of studioProcess
              exit repeat
            end if
          end repeat
          if targetProcess is missing value then
            if (count of studioProcesses) is 1 then
              set targetProcess to item 1 of studioProcesses
            else
              set studioChoices to {}
              repeat with studioProcess in studioProcesses
                set studioTitle to "Roblox Studio"
                try
                  set studioTitle to name of front window of studioProcess
                end try
                set end of studioChoices to studioTitle & " (" & (unix id of studioProcess as text) & ")"
              end repeat
              with timeout of 120 seconds
                tell current application
                  set selectedChoice to choose from list studioChoices with title "Publish Place" with prompt "Which Studio instance would you like to publish?" OK button name "Publish" multiple selections allowed false empty selection allowed false
                end tell
              end timeout
              if selectedChoice is false then return "cancelled"
              repeat with choiceIndex from 1 to count of studioChoices
                if item choiceIndex of studioChoices is item 1 of selectedChoice then
                  set targetProcess to item choiceIndex of studioProcesses
                  exit repeat
                end if
              end repeat
            end if
          end if
          tell targetProcess
            click menu item "Publish to Roblox" of menu "File" of menu bar 1
          end tell
        end tell
        return "sent"
      `,
        ],
        { timeout: 150_000 },
      );
      if (stdout.trim() === "not-running")
        throw new Error("Roblox Studio isn't running");
      if (stdout.trim() === "cancelled") return;
      if (stdout.trim() !== "sent") throw new Error("Couldn't publish");
    } catch (error) {
      const failure = error as Error & { stderr?: string };
      if (failure.stderr) {
        if (
          /-1743|-1719|assistive access|not authorized/i.test(failure.stderr)
        ) {
          throw new Error(
            "Allow Raycast Accessibility and Automation access in System Settings",
          );
        }
        throw new Error("Couldn't publish — check Studio's File menu");
      }
      throw failure;
    }

    return "Publishing...";
  });
}
