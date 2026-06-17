import { closeMainWindow, showHUD, showToast, Toast } from "@raycast/api";
import wifi from "manage-wifi";
import fixPath from "fix-path";

fixPath();

export default async () => {
  try {
    await showHUD("Restarting WiFi...");
    await wifi.restart();
    await showHUD("WiFi restarted!");
    await closeMainWindow();
  } catch (err: unknown) {
    if (err instanceof Error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Something went wrong",
        message: err.message,
      });
    }
  }
};
