import { closeMainWindow, showHUD, showToast, Toast } from "@raycast/api";
import { execFileAsync, getErrorMessage, openCmuxApp } from "./cli";

export default async function Command() {
  try {
    await openCmuxApp();
    const output = (await execFileAsync("cmux", ["new-workspace"])).trim();
    const match = output.match(/(workspace:\d+)/);

    if (match) {
      await execFileAsync("cmux", ["select-workspace", "--workspace", match[1]]);
    } else {
      await showHUD("New workspace created but could not be selected automatically");
    }

    await closeMainWindow();
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to create workspace",
      message: getErrorMessage(error),
    });
  }
}
