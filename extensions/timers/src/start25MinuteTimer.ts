import { checkForOverlyLoudAlert, startTimer } from "./backend/timerBackend";

export default async () => {
  if (!checkForOverlyLoudAlert()) return;
  await startTimer({
    timeInSeconds: 60 * 25,
    timerName: "25 Minute Timer",
  });
};
