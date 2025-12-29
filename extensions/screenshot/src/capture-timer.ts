import { LaunchProps, showHUD } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";
import * as os from "os";
import * as path from "path";

const execAsync = promisify(exec);

export default async (props: LaunchProps<{ arguments: { time?: string } }>) => {
  const delayInput = props.arguments.time || "5";
  const delay = parseFloat(delayInput);

  if (isNaN(delay) || delay < 0) {
    showHUD("Invalid delay: Please provide a valid non-negative number for delay.");
    return;
  }

  const filePath = path.join(os.homedir(), "Desktop", "timed_shot.png");

  try {
    await execAsync(`/usr/sbin/screencapture -T ${delay} "${filePath}"`);
    showHUD(`Screenshot saved to ${filePath}`);
  } catch (error) {
    showHUD("Screenshot failed: " + (error instanceof Error ? error.message : String(error)));
  }
};
