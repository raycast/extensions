import { checkForOverlyLoudAlert, startTimer } from "./backend/timerBackend";

export default async () => {
  if (!checkForOverlyLoudAlert()) return;
  await startTimer({
    timeInSeconds: 60 * 15,
    timerName: "15 Minute Timer",
  });
};
