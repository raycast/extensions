import { closeMainWindow, showHUD } from "@raycast/api";
import { startTimer } from "./timerUtils";

export default async () => {
  await closeMainWindow();
  await startTimer(60 * 15);
  await showHUD("Timer started for 15 minutes! 🎉");
};
