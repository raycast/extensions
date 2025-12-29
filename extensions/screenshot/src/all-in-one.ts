import { showHUD } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export default async () => {
  try {
    await execAsync("/usr/sbin/screencapture -icU");
    showHUD("Screenshot copied to clipboard");
  } catch (error) {
    showHUD("Error: Permission denied or command failed: " + (error instanceof Error ? error.message : String(error)));
  }
};
