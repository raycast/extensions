import { startCaffeinate, getSchedule, changeScheduleState, deviceName } from "./utils";

export default async () => {
  const schedule = await getSchedule();
  // Pausing a schedule that hasn't started would keep it off until the user resumes it.
  if (schedule?.IsRunning) await changeScheduleState("decaffeinate", schedule);
  await startCaffeinate({ menubar: true, status: true }, `Your ${deviceName()} is now caffeinated`);
};
