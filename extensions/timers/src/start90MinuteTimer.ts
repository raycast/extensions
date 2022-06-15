import { closeMainWindow, showHUD } from "@raycast/api";
import { startTimer } from "./timerUtils";

export default async () => {
  await closeMainWindow();
  await startTimer(60 * 90);
  await showHUD("Timer started for 90 minutes! 🎉");
};
