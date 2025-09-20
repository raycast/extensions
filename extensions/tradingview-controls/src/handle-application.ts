import { checkInstallation } from "./check-installation";
import { launchAndFocusApplication } from "./launch-and-focus-application";

/**
 * Checks if TradingView is installed and running.
 * @returns TradingView application status
 */
export async function handleApplication(): Promise<{
  isInstalled: boolean;
  isRunning: boolean;
}> {
  let isRunning = false;
  const isInstalled = await checkInstallation();
  if (isInstalled) {
    isRunning = await launchAndFocusApplication();
  }

  return { isInstalled, isRunning };
}
