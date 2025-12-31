import { showToast, Toast, closeMainWindow, getPreferenceValues } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";
import { access } from "fs/promises";

const execAsync = promisify(exec);

export default async function Command() {
  await closeMainWindow();
  try {
    const prefs = getPreferenceValues<Preferences>();
    const sharexPath = prefs.sharexPath || "C:\\Program Files\\ShareX\\ShareX.exe";

    await access(sharexPath);
    await execAsync(`"${sharexPath}" -RectangleRegion`);
  } catch (error) {
    const title =
      error instanceof Error && "code" in error && error.code === "ENOENT"
        ? "ShareX.exe not found"
        : "Failed to start ShareX";
    await showToast({ style: Toast.Style.Failure, title, message: String(error) });
  }
}
