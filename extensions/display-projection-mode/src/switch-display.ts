import { showToast, Toast } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function switchDisplay(mode: string, successTitle: string) {
  try {
    await execAsync(`DisplaySwitch.exe ${mode}`, {
      encoding: "utf-8",
      windowsHide: true,
    });
    await showToast({
      style: Toast.Style.Success,
      title: successTitle,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Display mode change failed:", errorMessage);
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to change display mode",
      message: errorMessage,
    });
  }
}
