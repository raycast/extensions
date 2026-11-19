import { closeMainWindow, getApplications, open, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { promisify } from "node:util";
import { APP_NAME, BUNDLE_ID, DOWNLOAD_URL, schemeIsPlaceholder } from "./links";

const execFileAsync = promisify(execFile);

/** Finds Space Manager by bundle id. Read-only; nothing is launched. */
export async function findSpaceManager(): Promise<string | undefined> {
  try {
    const apps = await getApplications();
    const match = apps.find((app) => app.bundleId === BUNDLE_ID);
    if (match) return match.path;
  } catch {
    // Fall through: some Raycast-compatible launchers may not implement getApplications.
  }
  try {
    const { stdout } = await execFileAsync("/usr/bin/mdfind", [`kMDItemCFBundleIdentifier == '${BUNDLE_ID}'`]);
    const paths = stdout.split("\n").filter((line) => line.endsWith(".app"));
    const path = paths.find((line) => line.startsWith("/Applications/")) ?? paths[0];
    if (path) return path;
  } catch {
    // Spotlight may be off.
  }
  const fallback = `/Applications/${APP_NAME}.app`;
  return existsSync(fallback) ? fallback : undefined;
}

export async function showNotInstalledToast(): Promise<void> {
  await showToast({
    style: Toast.Style.Failure,
    title: `${APP_NAME} isn't installed`,
    message: "Get it from pangalin.com",
    primaryAction: {
      title: "Get Space Manager",
      onAction: () => open(DOWNLOAD_URL),
    },
  });
}

/** Opens a Space Manager link after checking the app is installed. */
export async function openInSpaceManager(url: string): Promise<void> {
  const appPath = await findSpaceManager();
  if (!appPath) {
    await showNotInstalledToast();
    return;
  }
  if (schemeIsPlaceholder()) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Not ready yet",
      message: "This version of the extension doesn't know Space Manager's links yet.",
    });
    return;
  }
  try {
    await open(url, appPath);
    await closeMainWindow();
  } catch (error) {
    await showFailureToast(error, { title: `Couldn't open ${APP_NAME}` });
  }
}

/** Opens the app itself (no route). Used by Free Space. */
export async function openSpaceManagerApp(): Promise<void> {
  const appPath = await findSpaceManager();
  if (!appPath) {
    await showNotInstalledToast();
    return;
  }
  try {
    await open(appPath);
    await closeMainWindow();
  } catch (error) {
    await showFailureToast(error, { title: `Couldn't open ${APP_NAME}` });
  }
}
