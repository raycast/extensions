import { checkSchedule } from "../status";
import { isCaffeinateRunning } from "../utils";

/**
 * Checks if your PC is currently prevented from sleeping
 */
export default async function () {
  const isCaffeinated = await isCaffeinateRunning();
  const isScheduled = await checkSchedule();

  if (isCaffeinated || isScheduled) {
    return "Your PC is currently caffeinated (sleep is prevented)";
  } else {
    return "Your PC is not caffeinated (normal sleep settings apply)";
  }
}
