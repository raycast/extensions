import { stopCaffeinate, getSchedule, deviceName } from "./utils";
import { showToast, Toast } from "@raycast/api";

export default async () => {
  const schedule = await getSchedule();
  if (schedule != undefined && schedule.IsRunning == true)
    await showToast(Toast.Style.Failure, "Caffeination schedule running, pause to decaffeinate");
  else await stopCaffeinate({ menubar: true, status: true }, `Your ${deviceName()} is now decaffeinated`);
};
