import { startCaffeinate, changeScheduleState } from "./utils";

export default async () => {
  changeScheduleState("caffeinate");
  await startCaffeinate({ menubar: true, status: true }, "Your Mac is now caffeinated");
};
