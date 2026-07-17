import { checkForOverlyLoudAlert, startTimer } from "./backend/timerBackend";

export default async () => {
  if (!checkForOverlyLoudAlert()) return;
  await startTimer({ timeInSeconds: 60 * 5, timerName: "5 Minute Timer" });
};
