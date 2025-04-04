import { Application, getApplications, showToast, Toast } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";

const execPromise = promisify(exec);

export async function quitApp(bundleId: string): Promise<void> {
  try {
    // First attempt: Quit using the bundle ID (most reliable for most apps)
    try {
      await execPromise(`osascript -e 'tell application id "${bundleId}" to quit'`);
      return;
    } catch (initialError) {
      console.error(`Initial quit attempt failed: ${initialError}`);

      // Second attempt: Try using the app name derived from the bundle ID
      const appName = bundleId.split(".").pop() || bundleId;
      if (appName) {
        try {
          // Try with the simple app name (e.g., "Chrome" for "com.google.Chrome")
          await execPromise(`osascript -e 'tell application "${appName}" to quit'`);
          return;
        } catch (nameError) {
          console.error(`Quit by name failed: ${nameError}`);

          // For Chrome specifically, try the full name
          if (appName.toLowerCase() === "chrome") {
            try {
              await execPromise(`osascript -e 'tell application "Google Chrome" to quit'`);
              return;
            } catch (chromeError) {
              console.error(`Chrome-specific quit failed: ${chromeError}`);
            }
          }
        }
      }
    }

    throw new Error(`Failed to quit app with bundle ID: ${bundleId}`);
  } catch (error) {
    console.error(`Error quitting app: ${error}`);
    throw new Error(`Failed to quit app with bundle ID: ${bundleId}`);
  }
}

export async function launchApp(bundleId: string, startupArgs?: string): Promise<void> {
  try {
    // First attempt: Launch using bundle ID with optional arguments
    try {
      const argsString = startupArgs ? ` --args ${startupArgs}` : "";
      await execPromise(`open -b ${bundleId}${argsString}`);
      return;
    } catch (initialError) {
      console.error(`Initial launch attempt failed: ${initialError}`);

      // Second attempt: Handle special cases, including Chrome
      const appName = bundleId.split(".").pop() || bundleId;

      // Try to find the app in the Applications folder
      if (appName) {
        // For Chrome specifically
        if (appName.toLowerCase() === "chrome") {
          try {
            const argsString = startupArgs ? ` --args ${startupArgs}` : "";
            await execPromise(`open -a "Google Chrome"${argsString}`);
            return;
          } catch (chromeError) {
            console.error(`Chrome-specific launch failed: ${chromeError}`);
          }
        }

        // Generic fallback: Try to open by app name
        try {
          const argsString = startupArgs ? ` --args ${startupArgs}` : "";
          await execPromise(`open -a "${appName}"${argsString}`);
          return;
        } catch (nameError) {
          console.error(`Launch by name failed: ${nameError}`);
        }
      }
    }

    throw new Error(`Failed to launch app with bundle ID: ${bundleId}`);
  } catch (error) {
    console.error(`Error launching app: ${error}`);
    throw new Error(`Failed to launch app with bundle ID: ${bundleId}`);
  }
}

// Check if an app is running using the ps command
async function isAppRunning(bundleId: string): Promise<boolean> {
  try {
    // Get app name from bundle ID for process matching
    const appName = bundleId.split(".").pop() || bundleId;

    // Special handling for Chrome
    if (bundleId === "com.google.Chrome") {
      try {
        // Use ps to check for Chrome process
        const { stdout } = await execPromise('ps -A | grep -i "Google Chrome" | grep -v grep');
        return stdout.trim().length > 0;
      } catch {
        // If grep returns nothing, it will have a non-zero exit code
        // which causes execPromise to throw, but this just means Chrome isn't running
        return false;
      }
    }

    // Generic process check using ps and grep
    try {
      // First try with the last component of bundle ID
      const { stdout } = await execPromise(`ps -A | grep -i "${appName}" | grep -v grep`);
      if (stdout.trim().length > 0) {
        return true;
      }
    } catch {
      // Process not found - continue to next check
    }

    // For apps with capitalized names
    if (appName) {
      try {
        const capitalizedName = appName.charAt(0).toUpperCase() + appName.slice(1);
        const { stdout } = await execPromise(`ps -A | grep -i "${capitalizedName}" | grep -v grep`);
        if (stdout.trim().length > 0) {
          return true;
        }
      } catch {
        // Process not found - continue to final check
      }
    }

    return false;
  } catch (error) {
    console.error(`Error checking if app is running: ${error}`);
    return false;
  }
}

// Wait for an app to exit with a more efficient polling strategy
async function waitForAppToExit(bundleId: string, maxWaitMs: number = 5000): Promise<boolean> {
  const startTime = Date.now();

  // Get a more user-friendly name for the app
  let appName = bundleId.split(".").pop() || bundleId;

  // Make the display name more readable
  // Convert camelCase or lowercase to Title Case (e.g., "Chrome" to "Chrome")
  appName = appName.charAt(0).toUpperCase() + appName.slice(1);

  // Special cases for common apps
  if (appName.toLowerCase() === "chrome") {
    appName = "Google Chrome";
  }

  // Show initial toast
  await showToast({
    style: Toast.Style.Animated,
    title: `Waiting for ${appName} to exit...`,
  });

  // Use a dynamic polling strategy
  // Start with a very short interval and gradually increase it
  let pollInterval = 50; // Start with 50ms
  const maxPollInterval = 200; // Cap at 200ms

  while (Date.now() - startTime < maxWaitMs) {
    const running = await isAppRunning(bundleId);

    if (!running) {
      return true; // App has exited
    }

    // Wait before next check, with dynamic interval
    await new Promise((resolve) => setTimeout(resolve, pollInterval));

    // Increase polling interval for next iteration, but cap it
    pollInterval = Math.min(pollInterval * 1.5, maxPollInterval);
  }

  // If we got here, we timed out
  return false;
}

export async function restartApp(bundleId: string, startupArgs?: string): Promise<void> {
  try {
    // Get a more user-friendly name for the app
    let appName = bundleId.split(".").pop() || bundleId;

    // Make the display name more readable
    appName = appName.charAt(0).toUpperCase() + appName.slice(1);

    // Special cases for common apps
    if (appName.toLowerCase() === "chrome") {
      appName = "Google Chrome";
    }

    // Show initial toast
    await showToast({
      style: Toast.Style.Animated,
      title: `Restarting ${appName}...`,
    });

    // Quit the app
    await quitApp(bundleId);

    // Use the smart wait method
    const appExited = await waitForAppToExit(bundleId);

    if (!appExited) {
      await showToast({
        style: Toast.Style.Failure,
        title: `Timed out waiting for ${appName} to quit`,
        message: "Starting app anyway...",
      });
    }

    // Launch the app with optional startup args
    await launchApp(bundleId, startupArgs);

    // Show success toast
    await showToast({
      style: Toast.Style.Success,
      title: `${appName} restarted successfully`,
    });
  } catch (error) {
    console.error(`Error in restartApp: ${error}`);
    throw error;
  }
}

export async function getInstalledApps(): Promise<{ name: string; bundleId: string }[]> {
  try {
    // Use Raycast's built-in API to get all applications
    const applications: Application[] = await getApplications();

    // Map to the format expected by our extension
    return applications
      .filter((app) => app.bundleId) // Filter out apps without bundleIds
      .map((app) => ({
        name: app.name,
        bundleId: app.bundleId || "",
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error(`Error getting installed apps: ${error}`);
    return [];
  }
}

export async function restartMultipleApps(apps: { bundleId: string; startupArgs?: string }[]): Promise<void> {
  try {
    if (apps.length === 0) {
      throw new Error("No apps to restart");
    }

    // Show initial toast
    await showToast({
      style: Toast.Style.Animated,
      title: `Restarting ${apps.length} app(s)...`,
    });

    // Create an array of promises to handle each app restart independently
    const restartPromises = apps.map(async (app) => {
      try {
        // Get a more user-friendly name for the app
        let appName = app.bundleId.split(".").pop() || app.bundleId;
        appName = appName.charAt(0).toUpperCase() + appName.slice(1);

        // Special cases for common apps
        if (appName.toLowerCase() === "chrome") {
          appName = "Google Chrome";
        }

        // Quit the app
        await quitApp(app.bundleId);

        // Wait for this specific app to exit
        const appExited = await waitForAppToExit(app.bundleId);

        if (!appExited) {
          console.log(`Timed out waiting for ${appName} to quit, starting anyway...`);
        }

        // Launch this app with its startup args immediately after it quits
        await launchApp(app.bundleId, app.startupArgs);

        return { success: true, bundleId: app.bundleId, name: appName };
      } catch (error) {
        console.error(`Error restarting app ${app.bundleId}: ${error}`);
        return { success: false, bundleId: app.bundleId, error };
      }
    });

    // Wait for all restart operations to complete
    const results = await Promise.all(restartPromises);

    // Count successes and failures
    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.length - successCount;

    // Show final toast based on results
    if (failureCount === 0) {
      await showToast({
        style: Toast.Style.Success,
        title: `Successfully restarted ${successCount} app(s)`,
      });
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: `Restarted ${successCount} app(s), ${failureCount} failed`,
        message: "Check logs for details",
      });
    }
  } catch (error) {
    console.error(`Error in restartMultipleApps: ${error}`);
    throw error;
  }
}
