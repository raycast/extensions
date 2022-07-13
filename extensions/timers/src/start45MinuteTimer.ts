import { closeMainWindow, showHUD } from "@raycast/api";
import { startTimer } from "./timerUtils";

export default async () => {
  await closeMainWindow();
  await startTimer(60 * 45);
  await showHUD("Timer started for 45 minutes! 🎉");
};
