import { exec } from "child_process";
import { promisify } from "util";
import { showToast, Toast } from "@raycast/api";

const execAsync = promisify(exec);

export default async function Command() {
  try {
    // Get the path of the current Finder window
    const { stdout: finderPath } = await execAsync(
      'osascript -e "tell application \\"Finder\\" to get POSIX path of (target of front window as alias)"',
    );

    const path = finderPath.trim();

    if (!path) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No Finder window found",
        message: "Please open a Finder window first",
      });
      return;
    }

    // Open the path in Cursor
    await execAsync(`open -a "Cursor" "${path}"`);

    await showToast({
      style: Toast.Style.Success,
      title: "Opened in Cursor",
      message: path,
    });
  } catch (error) {
    console.error("Error:", error);

    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to open in Cursor",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
