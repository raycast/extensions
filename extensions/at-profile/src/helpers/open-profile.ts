import { showError } from "@chrismessina/raycast-kit";
import { open, showHUD } from "@raycast/api";
import { App } from "../types";
import { findApp } from "./apps";
import { recordProfileOpen } from "./history";
import { buildProfileUrl, cleanProfile } from "./url";

/**
 * Open a profile on an app and record it in History
 * @throws when the app doesn't exist or the profile is empty
 */
export async function openProfile(profile: string, appValue: string): Promise<{ app: App; profile: string }> {
  const app = await findApp(appValue);
  if (!app) {
    throw new Error(`App "${appValue}" not found`);
  }
  const clean = cleanProfile(profile);
  await open(buildProfileUrl(app.urlTemplate, clean));

  await recordOpenBestEffort(clean, app);
  return { app, profile: clean };
}

async function recordOpenBestEffort(profile: string, app: App) {
  try {
    await recordProfileOpen(profile, app.value, app.name);
  } catch (error) {
    console.error("Couldn't record the open in History:", error);
  }
}

/**
 * openProfile for commands: a HUD on success, a failure toast with Copy Error otherwise
 */
export async function openProfileWithFeedback(profile: string, appValue: string): Promise<void> {
  try {
    const result = await openProfile(profile, appValue);
    await showHUD(`Opened @${result.profile} on ${result.app.name}`);
  } catch (error) {
    await showError(error, { title: "Couldn't Open Profile" });
  }
}
