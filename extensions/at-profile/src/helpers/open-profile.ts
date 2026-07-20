import { open, showHUD } from "@raycast/api";
import { withErrorHandling } from "../utils/errors";
import { getAllApps, getAllAppsUnfiltered, addToUsageHistory } from "./apps";
import { getAppByValue } from "./custom-app-utils";
import { sanitizeUrl } from "../utils/url-sanitize";
import { App } from "../types";

/**
 * Opens a profile on a social app
 * @param profile - The profile username/handle
 * @param appValue - The app identifier (e.g., "twitter", "instagram")
 * @param bypassAppSettings - Whether to bypass app visibility settings
 * @param showHudMessage - Whether to show success HUD message
 */
async function openProfileCore(
  profile: string,
  appValue: string,
  bypassAppSettings = false,
  showHudMessage = true,
): Promise<void> {
  // Get apps based on bypass setting
  const apps = bypassAppSettings ? await getAllAppsUnfiltered() : await getAllApps();

  // Find the app
  let app = apps.find((a: App) => a.value === appValue);

  // If not found in regular apps, try custom apps
  if (!app) {
    const customApp = await getAppByValue(appValue);
    app = customApp || undefined;
  }

  if (!app) {
    throw new Error(`App '${appValue}' not found or is disabled`);
  }

  // Clean the profile input
  const cleanProfile = profile.replace(/^@/, "").trim();
  if (!cleanProfile) {
    throw new Error("Please enter a valid profile");
  }

  // Build the URL
  const url = app.urlTemplate.replace(/{profile}/g, encodeURIComponent(cleanProfile));

  // Sanitize the URL to ensure safe protocols
  const sanitizedUrl = sanitizeUrl(url);

  // Open the sanitized URL
  await open(sanitizedUrl);

  // Add to usage history
  await addToUsageHistory(cleanProfile, appValue, app.name);

  // Show success message
  if (showHudMessage) {
    await showHUD(`Opened ${cleanProfile} on ${app.name}`);
  }
}

export const openProfile = withErrorHandling(openProfileCore, "opening profile", true, "Failed to open profile");
