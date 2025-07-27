import { open, showToast, Toast, popToRoot } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { getAllApps, getAllAppsUnfiltered } from "../hooks/apps";
import { addToProfileHistory, addToUsageHistory } from "../hooks/apps";

/**
 * Centralized function to open a profile on a social app
 * @param profile The profile to open
 * @param appValue The app identifier (e.g., "github", "twitter")
 * @param shouldPopToRoot Whether to pop to root after opening (default: true)
 * @param bypassAppSettings Whether to bypass manage apps settings (default: false)
 * @returns Promise<void>
 */
export async function openProfile(
  profile: string,
  appValue: string,
  shouldPopToRoot = true,
  bypassAppSettings = false,
): Promise<void> {
  try {
    const apps = bypassAppSettings ? await getAllAppsUnfiltered() : await getAllApps();

    if (apps.length === 0) {
      throw new Error("No apps are currently enabled. Please enable apps in Manage Apps.");
    }

    const selectedApp = apps.find((app) => app.value === appValue);
    if (!selectedApp) {
      const errorMessage = bypassAppSettings
        ? `App "${appValue}" not found`
        : `App "${appValue}" not found or is disabled`;
      throw new Error(errorMessage);
    }

    // Normalize profile (remove leading @ if present)
    const normalizedProfile = profile.startsWith("@") ? profile.slice(1) : profile;

    const url = selectedApp.urlTemplate.replace("{profile}", normalizedProfile);
    await open(url);

    // Add to both legacy profile history and new usage history
    await addToProfileHistory(normalizedProfile);
    await addToUsageHistory(normalizedProfile, selectedApp.value, selectedApp.name);

    await showToast({
      style: Toast.Style.Success,
      title: "Profile opened",
      message: `Opened ${normalizedProfile} on ${selectedApp.name}`,
    });

    if (shouldPopToRoot) {
      await popToRoot();
    }
  } catch (error) {
    await showFailureToast((error as Error).message, { title: "Failed to open profile" });
  }
}
