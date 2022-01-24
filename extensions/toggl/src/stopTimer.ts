import { closeMainWindow, showHUD, Toast, ToastStyle } from "@raycast/api";
import { getCurrentTimer, stopTimer } from "./toggl";
import { CurrentEntry } from "./types";

export default async () => {
  try {
    const entry: CurrentEntry = await getCurrentTimer();
    if (entry.data == null) {
      const toast = new Toast({ style: ToastStyle.Failure, title: "No timer is currently running!" });
      await toast.show();
    } else {
      await closeMainWindow();
      await stopTimer(entry.data.id);
      await showHUD("Timer stopped! 🎉");
    }
  } catch (err: any) {
    const toast = new Toast({ style: ToastStyle.Failure, title: "No timer is currently running!" });
    await toast.show();
  }
};
