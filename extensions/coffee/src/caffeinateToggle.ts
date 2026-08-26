import { isCaffeinateRunning, startCaffeinate, stopCaffeinate, deviceName } from "./utils";

export default async () => {
  const isRunning = await isCaffeinateRunning();

  if (isRunning) {
    await stopCaffeinate({ menubar: true, status: true }, `Your ${deviceName()} is now decaffeinated`);
  } else {
    await startCaffeinate({ menubar: true, status: true }, `Your ${deviceName()} is now caffeinated`);
  }
};
