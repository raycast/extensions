import { isCaffeinateRunning, stopCaffeinate, getSchedule, deviceName } from "./utils";
import { getPreferenceValues, showToast, Toast, launchCommand, LaunchType } from "@raycast/api";

export default async () => {
  const schedule = await getSchedule();
  const preferences = getPreferenceValues<Preferences>();
  if (schedule != undefined && schedule.IsRunning == true) {
    if (preferences.decaffeinatePausesSchedules) {
      await stopCaffeinate(
        { menubar: true, status: true },
        `Your ${deviceName()} is now decaffeinated (schedule paused)`,
        { pauseRunningSchedule: true },
      );
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: "Caffeination schedule running",
        message: "Pause to decaffeinate",
        primaryAction: {
          title: "Open Schedules",
          onAction: () => launchCommand({ name: "addSchedule", type: LaunchType.UserInitiated }),
        },
      });
    }
    return;
  }

  const isRunning = await isCaffeinateRunning();
  const hudMessage = isRunning
    ? `Your ${deviceName()} is now decaffeinated`
    : `Your ${deviceName()} is already decaffeinated`;

  await stopCaffeinate({ menubar: true, status: true }, hudMessage);
};
