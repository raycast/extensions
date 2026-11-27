import { closeMainWindow, getApplications, open, showHUD, showToast, Toast, type Application } from "@raycast/api";
import { runAppleScript, showFailureToast } from "@raycast/utils";
import { execFile } from "node:child_process";
import { extname, join } from "node:path";
import { promisify } from "node:util";

export const run = promisify(execFile);

// Every edition of SnapApp: the Mac App Store, the direct download from snapapp.im, and Setapp.
const BUNDLE_IDS = ["im.snapapp.mac", "co.founden.nativesnippingtool", "im.snapapp.mac-setapp"];
const APP_STORE_URL = "macappstore://apps.apple.com/app/id6817683799";
const WEBSITE_URL = "https://snapapp.im/?utm_source=raycast&utm_medium=extension&utm_campaign=raycast-store";
const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".heic", ".tif", ".tiff"]);

export function isImage(path: string): boolean {
  return IMAGE_EXTENSIONS.has(extname(path).toLowerCase());
}

// Runs a command's body and turns any failure into a toast that says what could not be done.
export async function runCommand(failureTitle: string, body: () => Promise<void>): Promise<void> {
  try {
    await body();
  } catch (error) {
    await showFailureToast(error, { title: failureTitle });
  }
}

async function findSnapApp(): Promise<Application | undefined> {
  const apps = await getApplications();
  for (const id of BUNDLE_IDS) {
    const app = apps.find((candidate) => candidate.bundleId === id);
    if (app) return app;
  }
  return undefined;
}

// Finds the installed SnapApp, or offers it when it is missing.
export async function requireSnapApp(): Promise<Application | undefined> {
  const app = await findSnapApp();
  if (!app) {
    await showToast({
      style: Toast.Style.Failure,
      title: "SnapApp is not installed",
      message: "SnapApp is free on the Mac App Store.",
      primaryAction: { title: "Get SnapApp on the Mac App Store", onAction: () => open(APP_STORE_URL) },
      secondaryAction: { title: "Visit snapapp.im", onAction: () => open(WEBSITE_URL) },
    });
  }
  return app;
}

// Versions that register snapapp:// start a capture whenever asked; earlier ones only when launched with --capture.
async function acceptsCaptureURL(app: Application): Promise<boolean> {
  try {
    const plist = join(app.path, "Contents/Info.plist");
    const { stdout } = await run("/usr/bin/plutil", ["-extract", "CFBundleURLTypes", "json", "-o", "-", plist]);
    return stdout.includes('"snapapp"');
  } catch {
    // plutil fails when the key is absent: this version has no URL scheme.
    return false;
  }
}

async function isRunning(app: Application): Promise<boolean> {
  if (!app.bundleId) return false;
  return (await runAppleScript(`application id "${app.bundleId}" is running`)) === "true";
}

export async function startCapture(app: Application): Promise<void> {
  const viaURL = await acceptsCaptureURL(app);
  if (!viaURL && (await isRunning(app))) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Update SnapApp to capture from Raycast",
      message: "This version of SnapApp starts a capture from Raycast only when it is not already open.",
    });
    return;
  }
  // Raycast's window must be gone before SnapApp freezes the screen for the selection.
  await closeMainWindow({ clearRootSearch: true });
  await new Promise((resolve) => setTimeout(resolve, 150));
  if (viaURL) {
    await run("/usr/bin/open", ["-g", "-a", app.path, "snapapp://capture"]);
  } else {
    await run("/usr/bin/open", ["-a", app.path, "--args", "--capture"]);
  }
}

export async function openInSnapApp(app: Application, paths: string[]): Promise<void> {
  await run("/usr/bin/open", ["-a", app.path, ...paths]);
  await showHUD(paths.length === 1 ? "Opened in SnapApp" : `Opened ${paths.length} images in SnapApp`);
}
