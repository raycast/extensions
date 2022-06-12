import { open, showHUD, Toast } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import { appLink, fileDownload, isDeskControllerInstalled, standUp } from "./utils";

export default async function () {
  const toast = new Toast({
    title: "Stand Up",
    style: Toast.Style.Animated,
  });

  toast.show();

  if (await !isDeskControllerInstalled()) {
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

  runAppleScript(standUp);

  await showHUD("Moving desk to stand-up position");
}
