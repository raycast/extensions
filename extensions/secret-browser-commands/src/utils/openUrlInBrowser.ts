import { exec } from "child_process";
import { promisify } from "util";
import { showHUD, showToast, Toast, getPreferenceValues } from "@raycast/api";

const execAsync = promisify(exec);

interface Preferences {
  showConfirmationHUD?: boolean;
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
  const command = `open -a "${escapedAppName}" "${escapedUrl}"`;

  try {
    // Show a loading toast if the operation might take time
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Opening in ${appName}...`,
    });

    await execAsync(command);

    // Dismiss the loading toast
    await toast.hide();

    // Show a subtle success HUD if enabled
    if (shouldShowSuccess) {
      await showHUD(`Opened ${new URL(url).hostname} in ${appName}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isAppNotFound = errorMessage.includes("Application not found");

    await showToast({
      style: Toast.Style.Failure,
      title: isAppNotFound ? "Application Not Found" : "Failed to Open URL",
      message: isAppNotFound
        ? `Could not find application: ${appName}`
        : `Could not open ${url} in ${appName}. ${errorMessage}`,
      primaryAction: {
        title: "Show in Finder",
        onAction: () => {
          // Using void to explicitly ignore the Promise result
          void (async () => {
            try {
              await execAsync(`open /Applications -R "${appName}.app"`);
            } catch (error) {
              console.error("Failed to open Finder:", error);
            }
          })();
        },
      },
    });

    // Re-throw to allow callers to handle the error if needed
    throw error;
  }
}
