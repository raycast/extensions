import { checkForOverlyLoudAlert, startTimer } from "./backend/timerBackend";

export default async () => {
  if (!checkForOverlyLoudAlert()) return;
  await startTimer({ timeInSeconds: 60 * 30, timerName: "30 Minute Timer" });
};
