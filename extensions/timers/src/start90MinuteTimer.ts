import { checkForOverlyLoudAlert, startTimer } from "./backend/timerBackend";

export default async () => {
  if (!checkForOverlyLoudAlert()) return;
  await startTimer({ timeInSeconds: 60 * 90, timerName: "90 Minute Timer" });
};
