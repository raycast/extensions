import { stopCaffeinate, deviceName, getSchedule } from "../utils";
import { getPreferenceValues, showToast, Toast, launchCommand, LaunchType } from "@raycast/api";

/**
 * Turns off caffeination, allowing your computer to go to sleep normally.
 * If a schedule is running, behavior depends on "Decaffeinate pauses running schedules" preference.
 */
export default async function () {
  const schedule = await getSchedule();
  const preferences = getPreferenceValues<Preferences>();

  if (schedule != undefined && schedule.IsRunning == true) {
    if (preferences.decaffeinatePausesSchedules) {
      await stopCaffeinate({ menubar: true, status: true }, undefined, { pauseRunningSchedule: true });
      return `${deviceName()} sleep prevention has been disabled and the running schedule has been paused`;
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: "Caffeination schedule running",
        message:
          "Pause the schedule before decaffeinating, or enable 'Decaffeinate pauses running schedules' in preferences",
        primaryAction: {
          title: "Open Schedules",
          onAction: () => launchCommand({ name: "addSchedule", type: LaunchType.UserInitiated }),
        },
      });
      throw new Error("Caffeination schedule running");
    }
  } else {
    await stopCaffeinate({ menubar: true, status: true });
    return `${deviceName()} sleep prevention has been disabled`;
  }
}
