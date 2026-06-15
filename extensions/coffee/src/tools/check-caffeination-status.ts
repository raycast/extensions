import { checkSchedule } from "../status";
import { isCaffeinateRunning } from "../utils";

/**
 * Checks if your Mac is currently prevented from sleeping
 */
export default async function () {
  const isCaffeinated = isCaffeinateRunning();
  const isScheduled = await checkSchedule();

  if (isCaffeinated || isScheduled) {
    return "Your Mac is currently caffeinated (sleep is prevented)";
  } else {
    return "Your Mac is not caffeinated (normal sleep settings apply)";
  }
}
