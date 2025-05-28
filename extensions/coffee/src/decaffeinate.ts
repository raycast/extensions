import { stopCaffeinate, getSchedule } from "./utils";
import { showToast, Toast } from "@raycast/api";

export default async () => {
  const schedule = await getSchedule();
  if (schedule != undefined && schedule.IsRunning == true)
    await showToast(Toast.Style.Failure, "Club Mate schedule running, pause to decaffeinate");
  else await stopCaffeinate({ menubar: true, status: true }, "Your Mac now doesn't have Club Mate");
};
