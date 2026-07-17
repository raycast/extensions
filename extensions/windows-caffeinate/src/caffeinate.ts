import { showToast, Toast } from "@raycast/api";
import { startCaffeinate, getSchedule, changeScheduleState } from "./utils";

export default async function Command() {
  const schedule = await getSchedule();
  if (schedule !== undefined) await changeScheduleState("decaffeinate", schedule);

  try {
    await startCaffeinate({ status: true }, "Your PC is now caffeinated");
  } catch (error) {
    await showToast(Toast.Style.Failure, "Failed to caffeinate", String(error));
  }
}
