import { startCaffeinate, getSchedule, changeScheduleState } from "./utils";

export default async () => {
  const schedule = await getSchedule();
  if (schedule != undefined) await changeScheduleState("decaffeinate", schedule);
  await startCaffeinate({ menubar: true, status: true }, "Your Mac is now caffeinated");
};
