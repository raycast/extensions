import { closeMainWindow } from "@raycast/api";
import { startTimer } from "./timerUtils";

export default async () => {
  await closeMainWindow();
  startTimer(60 * 15, "15 Minute Sleep Timer");
};
