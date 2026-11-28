import { startCaffeinate, getSchedule, changeScheduleState, deviceName } from "./utils";

export default async () => {
  const schedule = await getSchedule();
  if (schedule != undefined) await changeScheduleState("decaffeinate", schedule);
  await startCaffeinate({ menubar: true, status: true }, `Your ${deviceName()} is now caffeinated`);
};
