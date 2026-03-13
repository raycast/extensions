import { closeMainWindow } from "@raycast/api";
import { startTimer } from "./timerUtils";

export default async () => {
  await closeMainWindow();
  startTimer(60 * 90, "90 Minute Sleep Timer");
};
