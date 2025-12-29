import { showHUD } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";
import * as os from "os";
import * as path from "path";

const execAsync = promisify(exec);

export default async () => {
  const filePath = path.join(os.homedir(), "Desktop", "screen.png");
  try {
    await execAsync(`/usr/sbin/screencapture "${filePath}"`);
    showHUD("Screenshot saved to Desktop");
  } catch (error) {
    showHUD("Error: " + (error instanceof Error ? error.message : String(error)));
  }
};
