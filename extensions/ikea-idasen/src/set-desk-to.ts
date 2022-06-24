import { open, showHUD, Toast } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import { appLink, fileDownload, isDeskControllerInstalled, standUp } from "./utils";

export default async function (height: number) {
  const toast = new Toast({
    title: "Set desk to position",
    style: Toast.Style.Animated,
  });

  toast.show();

  if (!(await isDeskControllerInstalled())) {
    toast.title = "Desk Controller not installed";
    toast.message =
      "Install it from: https://github.com/DWilliames/idasen-controller/releases/latest/download/Desk.Controller.app.zip";
    toast.style = Toast.Style.Failure;
    toast.primaryAction = {
      title: "Download",
      onAction: () => {
        open(fileDownload);
        toast.hide();
      },
    };
    toast.secondaryAction = {
      title: "Open in Browser",
      onAction: () => {
        open(appLink);
        toast.hide();
      },
    };
    return;
  }

  try {
    await runAppleScript(`tell application "Desk Controller"
    move to "${height}cm"
end tell`);
  } catch (e) {
    toast.title = "Desk Controller is not on the right version";
    toast.message =
      "Update your version it from: https://github.com/DWilliames/idasen-controller/releases/latest/download/Desk.Controller.app.zip";
    toast.style = Toast.Style.Failure;
  }

  await showHUD(`Moving desk to ${height}cm`);
}
