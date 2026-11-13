import { isCoffeeRunning, startCaffeinate, stopCaffeinate, deviceName, prepareUserStop } from "./utils";

export default async () => {
  const isRunning = await isCoffeeRunning();

  if (isRunning) {
    const decision = await prepareUserStop();
    if (!decision.allowed) return;
    await stopCaffeinate({ menubar: true, status: true }, true, {
      pauseRunningSchedule: decision.pauseRunningSchedule,
    });
  } else {
    await startCaffeinate({ menubar: true, status: true }, `Your ${deviceName()} is now caffeinated`);
  }
};
