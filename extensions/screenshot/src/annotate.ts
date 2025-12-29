import { showHUD } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export default async () => {
  try {
    await execAsync("/usr/sbin/screencapture -iP");
    showHUD("Screenshot captured and opened for annotation");
  } catch (error) {
    showHUD("Error: " + (error instanceof Error ? error.message : String(error)));
  }
};
