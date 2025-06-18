import { promisify } from "util";
import { execFile } from "child_process";
import { join } from "path";
import { environment } from "@raycast/api";

// Internal Helper
const execAsync: (
  path: string,
  args: string[],
) => Promise<{ stdout: string; stderr: string }> = promisify(execFile);

/**
 * Passes the file path to the export-settings-data command
 */

export const passFilePath: (filePath: string) => Promise<void> = async (
  filePath: string,
) => {
  // Execute the keystroke command (Cmd+Shift+G)
  await execAsync("osascript", [
    join(environment.assetsPath, "/keystroke.applescript"),
  ]);

  // Put the file path text
  await execAsync("osascript", [
    join(environment.assetsPath, "/put-text.applescript"),
    filePath,
  ]);
};

/** Presses the enter key through AppleScript */
export const pressEnter: () => Promise<void> = async () => {
  try {
    await execAsync("osascript", [
      join(environment.assetsPath, "/enter.applescript"),
    ]);
  } catch (error) {
    console.error(error);
  }
};
