import { closeMainWindow, getApplications, getPreferenceValues, open, showToast, Toast } from "@raycast/api";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

const APP_STORE_URL = "macappstore://apps.apple.com/app/id1225570693";
const WEBSITE_URL = "https://ulysses.app";

export function getPreferences() {
  return getPreferenceValues<Preferences>();
}

async function isUlyssesInstalled() {
  const applications = await getApplications();
  return applications.some(
    ({ bundleId }) => bundleId === "com.ulyssesapp.mac" || bundleId === "com.soulmen.ulysses-setapp",
  );
}

export async function openUlyssesCallback(url: string, options: { background?: boolean } = {}) {
  if (!(await isUlyssesInstalled())) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Ulysses is not installed",
      message: "Get it from the Mac App Store or ulysses.app.",
      primaryAction: { title: "Open Mac App Store", onAction: () => open(APP_STORE_URL) },
      secondaryAction: { title: "Visit ulysses.app", onAction: () => open(WEBSITE_URL) },
    });
    return false;
  }
  await closeMainWindow();
  if (options.background) {
    // Raycast's open() has no background option, so use macOS open -g to keep Ulysses behind.
    await execFileAsync("/usr/bin/open", ["-g", url]);
  } else {
    await open(url);
  }
  return true;
}

export function groupLabel(group?: string) {
  return group?.trim() || "Inbox";
}
