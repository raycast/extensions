import { showToast, Toast } from "@raycast/api";
import { execSync } from "child_process";

export default async function main() {
  try {
    execSync("DisplaySwitch.exe /internal", {
      encoding: "utf-8",
      windowsHide: true,
    });
    await showToast({
      style: Toast.Style.Success,
      title: "PC Screen Only activated",
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
