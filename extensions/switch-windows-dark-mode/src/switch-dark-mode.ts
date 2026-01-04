import { showToast, Toast } from "@raycast/api";
import { exec } from "child_process";
import path from "path";
import { promisify } from "util";

const execAsync = promisify(exec);

export default async function Command() {
  try {
    await showToast({
      style: Toast.Style.Animated,
      title: "Switching theme...",
    });

    const scriptPath = path.join(__dirname, "assets", "ToggleTheme.ps1");
    const { stdout, stderr } = await execAsync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${scriptPath}"`);

    if (stderr) {
      console.error("PowerShell stderr:", stderr);
    }

    const result = JSON.parse(stdout.trim());

    if (result.success) {
      await showToast({
        style: Toast.Style.Success,
        title: result.title,
        message: result.message,
      });
    } else {
      // Partial success or expected errors
      await showToast({
        style: Toast.Style.Failure,
        title: result.title,
        message: result.message,
      });
    }
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Script Failed",
      message: error instanceof Error ? error.message : "Unknown error occurred",
    });
  }
}
