import { exec } from "child_process";
import { promisify } from "util";
import {
  getPreferenceValues,
  closeMainWindow,
  showToast,
  Toast,
} from "@raycast/api";

const execAsync = promisify(exec);

interface Preferences {
  antigravityPath: string;
}

export async function openInAntigravity(
  path: string,
  options?: { newWindow?: boolean },
) {
  const preferences = getPreferenceValues<Preferences>();
  const antigravityPath = preferences.antigravityPath;

  try {
    // Using the CLI to open the path
    // The command usually is `antigravity <path>`
    // We need to quote the path in case it has spaces
    // Add -n flag if newWindow is true
    const cmd = `"${antigravityPath}" ${options?.newWindow ? "-n" : ""} "${path}"`;
    await execAsync(cmd);
    await closeMainWindow();
    await showToast({
      style: Toast.Style.Success,
      title: options?.newWindow
        ? "Opened in New Window"
        : "Opened in Antigravity",
      message: path,
    });
  } catch (error) {
    console.error(error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to open in Antigravity",
      message: String(error),
    });
  }
}
