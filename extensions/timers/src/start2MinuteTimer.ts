import { checkForOverlyLoudAlert, startTimer } from "./backend/timerBackend";

export default async () => {
  if (!checkForOverlyLoudAlert()) return;
  await startTimer({ timeInSeconds: 60 * 2, timerName: "2 Minute Timer" });
};
