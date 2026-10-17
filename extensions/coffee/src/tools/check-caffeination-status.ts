import { checkSchedule } from "../status";
import { isCaffeinateRunning, deviceName } from "../utils";

/**
 * Checks if your computer is currently prevented from sleeping
 */
export default async function () {
  const isCaffeinated = await isCaffeinateRunning();
  const isScheduled = await checkSchedule();

  if (isCaffeinated || isScheduled) {
    return `Your ${deviceName()} is currently caffeinated (sleep is prevented)`;
  } else {
    return `Your ${deviceName()} is not caffeinated (normal sleep settings apply)`;
  }
}
