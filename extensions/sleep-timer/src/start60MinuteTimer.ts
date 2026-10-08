import { closeMainWindow } from "@raycast/api";
import { startTimer } from "./timerUtils";

export default async () => {
  await closeMainWindow();
  startTimer(60 * 60, "1 Hour Sleep Timer");
};
