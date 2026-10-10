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
          if not (exists process "Roblox Studio") then return "not-running"
          tell process "Roblox Studio"
            click menu item "Publish to Roblox" of menu "File" of menu bar 1
          end tell
        end tell
        return "sent"
      `,
        ],
        { timeout: 30_000 },
      );
      if (stdout.trim() === "not-running")
        throw new Error("Roblox Studio isn't running");
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
