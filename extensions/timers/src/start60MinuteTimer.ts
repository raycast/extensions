import { closeMainWindow } from "@raycast/api";
import { checkForOverlyLoudAlert, startTimer } from "./backend/timerBackend";

export default async () => {
  if (!checkForOverlyLoudAlert()) return;
  await closeMainWindow();
  startTimer({ timeInSeconds: 60 * 60, timerName: "1 Hour Timer" });
};
