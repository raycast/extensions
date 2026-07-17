import { showToast, Toast } from "@raycast/api";
import { stopCaffeinate, getSchedule } from "./utils";

export default async function Command() {
  const schedule = await getSchedule();
  if (schedule !== undefined && schedule.IsRunning === true) {
    await showToast(Toast.Style.Failure, "Caffeination schedule running, pause to decaffeinate");
    return;
  }

  try {
    await stopCaffeinate({ status: true }, "Your PC is now decaffeinated");
  } catch (error) {
    await showToast(Toast.Style.Failure, "Failed to decaffeinate", String(error));
  }
}
