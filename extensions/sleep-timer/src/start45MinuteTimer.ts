import { closeMainWindow } from "@raycast/api";
import { startTimer } from "./timerUtils";

export default async () => {
  await closeMainWindow();
  startTimer(60 * 45, "45 Minute Sleep Timer");
};
