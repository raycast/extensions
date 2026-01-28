import { showHUD } from "@raycast/api";
import { exec as execCallback } from "child_process";
import { promisify } from "util";

const exec = promisify(execCallback);

export default async function main() {
  try {
    // Check if Loop is running
    await exec("pgrep -x Loop");
    console.log("Loop is running.");
    // Loop is running, kill it
    await exec("pkill -x Loop");
    console.log("Loop was killed.");
  } catch (error) {
    // If error, Loop is not running or kill command failed
    console.log("Loop is not running or kill command failed.");
  }

  // Attempt to reopen Loop
  try {
    await exec("open -a Loop");
    console.log("Loop was successfully reopened or opened.");
    // Close the main window of Loop using AppleScript
    const closeMainWindowScript = `
      tell application "System Events" to tell process "Loop"
        set frontmost to true
        click (button 1 of window 1 where role description is "close button")
      end tell
    `;
    await exec(`osascript -e '${closeMainWindowScript}'`);
    showHUD("Loop was successfully reopened and the main window was closed.");
    console.log("Loop was successfully reopened and the main window was closed.");
  } catch (openError) {
    showHUD("Failed to open or reopen Loop. Please try again.");
    console.error("Failed to open or reopen Loop:", openError);
  }
}
