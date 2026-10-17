import { checkForOverlyLoudAlert, startTimer } from "./backend/timerBackend";

export default async () => {
  if (!checkForOverlyLoudAlert()) return;
  await startTimer({ timeInSeconds: 60, timerName: "1 Minute Timer" });
};
