import { PathLike } from "fs";
import { stat } from "fs/promises";

import { closeMainWindow, getApplications, showToast, Toast } from "@raycast/api";
import { runAppleScript } from "run-applescript";

/**
 * Check if Tim is installed
 */
export async function checkIfTimInstalled(): Promise<boolean> {
  const apps = await getApplications();
  const timInstalled = apps.find((app) => app.bundleId === "neat.software.Tim");

  return timInstalled !== undefined;
}

/**
 * Show not installed toast
 */
export async function showNotInstalledToast() {
  showToast({
    title: "Tim is not installed",
    style: Toast.Style.Failure,
  });
}

/**
 * Builds AppleScript to ensure Tim is running and then wraps the passed command(s).
 *
 * @param commandsToRunAfterTimIsRunning - The AppleScript command(s) to run after ensuring Tim is running.
 * @returns Generated AppleScript.
 */
export function buildScriptEnsuringTimIsRunning(commandsToRunAfterTimIsRunning: string): string {
  return `
    tell application "Tim"
      if not application "Tim" is running then
        activate

        set _maxOpenWaitTimeInSeconds to 5
        set _openCounter to 1
        repeat until application "Tim" is running
          delay 1
          set _openCounter to _openCounter + 1
          if _openCounter > _maxOpenWaitTimeInSeconds then exit repeat
        end repeat
      end if
      ${commandsToRunAfterTimIsRunning}
    end tell`;
}

/**
 * Runs the AppleScript and closes the main window afterwards.
 *
 * @remarks
 * The main window is before running the AppleScript to keep the UI snappy.
 *
 * @param appleScript - The AppleScript to run
 * @throws An error when the AppleScript fails to run
 * @returns A promise that is resolved when the AppleScript finished running
 */
export async function runAppleScriptSilently(appleScript: string) {
  await closeMainWindow();
  await runAppleScript(appleScript);
}

/**
 * Check if a file exists
 * @param path
 */
export async function existsFile(path: PathLike): Promise<boolean> {
  try {
    const fileStatus = await stat(path);
    return fileStatus.isFile();
  } catch (error) {
    return false;
  }
}
