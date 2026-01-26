import { closeMainWindow, showToast, Toast } from "@raycast/api";
import { exec } from "child_process";

export default async function Command() {
  try {
    exec("open -b com.trae.app -n");
    await closeMainWindow();
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to open new window",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
