import { showToast, Toast } from "@raycast/api";
import { exec } from "child_process";
import util from "util";

const execPromise = util.promisify(exec);

export default async function main() {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Checking for macOS updates...",
  });

  const appleScript = `tell application "System Events"
    set updatesAvailable to false

    delay 5 -- wait for the update pane to load

    -- Check if there are updates available
    tell application process "System Preferences"
        if exists (button "Update Now" of window 1) then
            set updatesAvailable to true
        else if exists (button "Restart Now" of window 1) then
            set updatesAvailable to true
        else if exists (button "Upgrade Now" of window 1) then
            set updatesAvailable to true
        end if
    end tell


    -- Return result
    if updatesAvailable then
        return "true"
    else
        return "false"
    end if
  end tell`;

  try {
    // Execute the AppleScript using osascript and await the result
    const { stdout } = await execPromise(`osascript -e '${appleScript}'`);

    // Check if there are updates
    const hasUpdates = stdout.trim() === "true";

    if (hasUpdates) {
      toast.style = Toast.Style.Success;
      toast.title = "Updates are available for your macOS.";
    } else {
      toast.style = Toast.Style.Success;
      toast.title = "Your macOS is up to date.";
    }
  } catch (err) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to check for updates.";
    if (err instanceof Error) {
      toast.message = err.message;
    }
  }
}
