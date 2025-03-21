import { execSync } from "node:child_process";
import { checkSchedule } from "../status";

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

function isCaffeinateRunning(): boolean {
  try {
    execSync("pgrep caffeinate");
    return true;
  } catch {
    return false;
  }
}
