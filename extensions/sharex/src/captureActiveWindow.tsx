import { closeMainWindow, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { execFile } from "child_process";

type Preferences = { sharexPath: string };

export default async function Command() {
  const { sharexPath } = getPreferenceValues<Preferences>();

  if (!sharexPath) {
    await showToast({ style: Toast.Style.Failure, title: "ShareX path not set" });
    return;
  }
  await closeMainWindow();

  execFile(sharexPath, ["-ActiveWindow"], (error) => {
    if (error) {
      showToast({ style: Toast.Style.Failure, title: "Error running sharex", message: error.message });
    } else {
      showToast({ style: Toast.Style.Success, title: "Screenshot taken" });
    }
  });
}
