import { showHUD, showToast, Toast } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const APPS_TO_QUIT = ["Slack", "zoom.us", "Microsoft Teams", "Webex", "Trello", "Notion"];

/**
 * Sleep for a given number of milliseconds.
 * @param ms - milliseconds to sleep
 */
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if a given application is installed using `open -Ra "AppName"`.
 * If the command fails, the app is considered not installed.
 */
async function isAppInstalled(app: string): Promise<boolean> {
  try {
    await execAsync(`open -Ra "${app}"`);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if the application is currently running using `pgrep -x "AppName"`.
 * If `pgrep` finds a matching process, it exits 0 (no error).
 * If not, it exits non-zero (error).
 */
async function isAppRunning(app: string): Promise<boolean> {
  try {
    await execAsync(`pgrep -x "${app}"`);
    return true;
  } catch {
    return false;
  }
}

/**
 * Quit the application using `killall "AppName"`.
 * We only attempt this if we know it's running.
 */
async function quitApp(app: string): Promise<boolean> {
  if (await isAppRunning(app)) {
    await showToast({
      style: Toast.Style.Animated,
      title: `Closing ${app}...`,
    });
    await sleep(1000);

    try {
      await execAsync(`killall "${app}"`);
      await showToast({
        style: Toast.Style.Success,
        title: `Closed ${app}`,
      });
      await sleep(1000);
      return true;
    } catch (error) {
      console.error(`Failed to quit ${app}: ${error}`);
      await showToast({
        style: Toast.Style.Failure,
        title: `Failed to close ${app}`,
      });
      await sleep(1000);
      return false;
    }
  } else {
    // Not running, skip
    return false;
  }
}

export default async function Command() {
  // Determine which apps are installed
  const installedApps: string[] = [];
  for (const app of APPS_TO_QUIT) {
    if (await isAppInstalled(app)) {
      installedApps.push(app);
    }
  }

  // Show a toast for installed apps
  await showToast({
    style: Toast.Style.Animated,
    title: `Found ${installedApps.length} installed apps`,
    message: installedApps.join(", "),
  });
  await sleep(1000);

  let succeededCount = 0;
  let runningCount = 0;

  for (const app of installedApps) {
    if (await isAppRunning(app)) {
      runningCount++;
      const success = await quitApp(app);
      if (success) {
        succeededCount++;
      }
    }
  }

  // Final HUD message
  // Show how many were installed, how many were running, and how many were closed
  await showHUD(
    `Out of ${installedApps.length} installed apps, ${runningCount} were running and ${succeededCount} closed successfully`,
  );
}
