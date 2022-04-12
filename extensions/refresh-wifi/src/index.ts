import { closeMainWindow, showHUD, showToast, Toast } from "@raycast/api";
import wifi from "manage-wifi";

export default async () => {
  try {
    await wifi.restart();
    await showHUD("Restarted Wifi");
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
