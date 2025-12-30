import { showToast, Toast, closeMainWindow, getPreferenceValues } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export default async function Command() {
  await closeMainWindow();

  try {
    const prefs = getPreferenceValues<Preferences>();
    const sharexPath = prefs.sharexPath || "C:\\Program Files\\ShareX\\ShareX.exe";
    await execAsync(`"${sharexPath}" -ScreenRecorderGIF`);
  } catch (error) {
    await showToast({ style: Toast.Style.Failure, title: "Failed to start ShareX", message: String(error) });
  }
}
