import { stopCaffeinate, changeScheduleState } from "./utils";

export default async () => {
  changeScheduleState("decaffeinate");
  await stopCaffeinate({ menubar: true, status: true }, "Your Mac is now decaffeinated");
};
