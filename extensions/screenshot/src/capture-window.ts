import { showHUD } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export default async () => {
  try {
    await execAsync("/usr/sbin/screencapture -iW");
    showHUD("Screenshot saved to Desktop");
  } catch (error) {
    showHUD("Error: " + (error instanceof Error ? error.message : String(error)));
  }
};
