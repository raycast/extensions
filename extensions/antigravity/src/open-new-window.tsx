import {
  closeMainWindow,
  showToast,
  Toast,
  getPreferenceValues,
} from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

interface Preferences {
  antigravityPath: string;
}

export default async function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const antigravityPath = preferences.antigravityPath;

  try {
    await execAsync(`"${antigravityPath}" -n`);
    await closeMainWindow();
    await showToast({
      style: Toast.Style.Success,
      title: "Opened New Window",
    });
  } catch (error) {
    console.error(error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to open new window",
      message: String(error),
    });
  }
}
