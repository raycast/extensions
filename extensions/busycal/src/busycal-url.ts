import { openBusyCalAutomationItem } from "./busycal-automation";
import { isUnsupportedOpenItemCommandError } from "./busycal-command-support";
import { execFileText } from "./shell";
import { BusyCalInstallation, BusyCalItem } from "./types";
import { busyCalURLLaunchArguments } from "./busycal-url-launch";

/**
 * Opens one BusyCal URL through Launch Services.
 *
 * - Parameters:
 *   - installation: The BusyCal app install that should own the URL open.
 *   - url: The BusyCal custom URL to launch.
 */
export async function openBusyCalURL(
  installation: BusyCalInstallation,
  url: string,
): Promise<void> {
  await execFileText(
    "open",
    busyCalURLLaunchArguments(installation.appPath, url),
  );
}

/**
 * Opens one BusyCal item in the BusyCal UI.
 *
 * The extension intentionally routes reveal through BusyCal's canonical
 * automation command instead of rebuilding item URLs from partial metadata.
 * That keeps dated tasks, undated tasks, recurring tasks, and detached events
 * aligned with the app's own identity rules.
 *
 * - Parameters:
 *   - installation: The BusyCal app install that should reveal the item.
 *   - item: The normalized BusyCal item returned by automation.
 * - Throws: When BusyCal does not provide a canonical item identity or when the
 *   installed BusyCal build predates the `open item` scripting command.
 */
export async function openBusyCalItem(
  installation: BusyCalInstallation,
  item: BusyCalItem,
): Promise<void> {
  const trimmedIdentity = item.id.trim();
  if (trimmedIdentity.length === 0) {
    throw new Error(
      "BusyCal did not return a canonical item identity for reveal.",
    );
  }

  try {
    await openBusyCalAutomationItem(installation, trimmedIdentity);
  } catch (error) {
    if (await isUnsupportedOpenItemCommandError(installation, error)) {
      throw new Error("BusyCal 2026.1.3 or later is required for item reveal.");
    }

    throw error;
  }
}
