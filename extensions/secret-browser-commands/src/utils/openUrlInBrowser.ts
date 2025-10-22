import { exec } from "child_process";
import { promisify } from "util";
import { showHUD, getPreferenceValues } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

const execAsync = promisify(exec);

interface Preferences {
  showConfirmationHUD?: boolean;
}

async function showAppInFinder(appName: string) {
  try {
    await execAsync(`open /Applications -R "${appName}.app"`);
  } catch (error) {
    await showFailureToast(error, {
      title: "Failed to open Finder",
      message: "Could not locate the application in the Applications folder",
    });
  }
}

/**
 * Opens a given URL in a specified browser application using the `open -a` command.
 * @param appName - The name of the application (e.g., "Google Chrome", "Arc").
 * @param url - The full URL to open (e.g., "chrome://settings").
 * @param options - Optional parameters for the operation.
 * @param options.showSuccess - Whether to show a success HUD notification. Defaults to user preference or true.
 */
export async function openUrlInBrowser(
  appName: string,
  url: string,
  { showSuccess }: { showSuccess?: boolean } = {},
): Promise<void> {
  const { showConfirmationHUD = true } = getPreferenceValues<Preferences>();
  const shouldShowSuccess = showSuccess ?? showConfirmationHUD;

  const escapedAppName = appName.replace(/"/g, '\\"');
  const escapedUrl = url.replace(/"/g, '\\"');
  // Use -F flag to force app to foreground
  const command = `open -F -a "${escapedAppName}" "${escapedUrl}"`;

  // Show a loading HUD if the operation might take time
  await showHUD(`Opening in ${appName}...`);

  try {
    await execAsync(command);

    if (shouldShowSuccess) {
      await showHUD(`Opened in ${appName}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isAppNotFound = errorMessage.includes("Application not found");

    if (isAppNotFound) {
      await showFailureToast(error, {
        title: "Application Not Found",
        message: `Could not find application: ${appName}`,
        primaryAction: {
          title: "Show in Finder",
          onAction: () => showAppInFinder(appName),
        },
      });
    } else {
      await showFailureToast(error, {
        title: "Failed to Open URL",
        message: `Could not open ${url} in ${appName}`,
      });
    }
  }
}
