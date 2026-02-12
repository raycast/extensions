import { showToast, Toast, getPreferenceValues } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

interface Preferences {
  gridviewPath?: string;
}

export default async function Command() {
  const prefs = getPreferenceValues<Preferences>();
  const appPath = prefs.gridviewPath || "/Applications/GridViewPro.app";

  try {
    // Check if GridView Pro is installed
    await execAsync(`test -d "${appPath}"`);

    // Launch the app
    await execAsync(`open "${appPath}"`);

    await showToast({
      style: Toast.Style.Success,
      title: "GridView Pro launched",
    });
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: "GridView Pro not found",
      message: "Is it installed? Try Mac App Store or update preferences",
    });
  }
}
