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

    // Smart '@' handling: Check if platform's URL template requires '@' symbol
    const requiresAtSymbol = selectedApp.urlTemplate.includes("@{profile}");
    
    let profileToUse: string;
    if (requiresAtSymbol) {
      // Platform needs '@' - ensure it's present
      profileToUse = profile.startsWith("@") ? profile : `@${profile}`;
    } else {
      // Platform doesn't need '@' - remove it if present
      profileToUse = profile.startsWith("@") ? profile.slice(1) : profile;
    }

    const url = selectedApp.urlTemplate.replace("{profile}", profileToUse);
    await open(url);

    // Add to both legacy profile history and new usage history (always store without '@' for consistency)
    const historyProfile = profile.startsWith("@") ? profile.slice(1) : profile;
    await addToProfileHistory(historyProfile);
    await addToUsageHistory(historyProfile, selectedApp.value, selectedApp.name);

    await showToast({
      style: Toast.Style.Success,
      title: "Profile opened",
      message: `Opened ${historyProfile} on ${selectedApp.name}`,
    });

    if (shouldPopToRoot) {
      await popToRoot();
    }
  } catch (error) {
    await showFailureToast((error as Error).message, { title: "Failed to open profile" });
  }
}
