import { closeMainWindow, open, showToast, Toast } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import { gatherInstalled, GATHER_APP_PATH } from "./utils";

export default async () => {
  const installed = await gatherInstalled();

  if (!installed) {
    const options: Toast.Options = {
      style: Toast.Style.Failure,
      title: "Gather is not installed.",
      message: "Install it from: https://www.gather.town",
      primaryAction: {
        title: "Go to https://www.gather.town",
        onAction: (toast) => {
          open("https://www.gather.town");
          toast.hide();
        },
      },
    };

    await showToast(options);
  } else {
    await closeMainWindow();
    await runAppleScript(`tell application (POSIX file "${GATHER_APP_PATH}" as alias) to activate`);

    // Toggle microphone
    await runAppleScript('tell application "System Events" to key code 0 using {shift down, command down}');
  }
};
