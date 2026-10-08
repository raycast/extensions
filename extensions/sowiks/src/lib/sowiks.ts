import { Application, closeMainWindow, getApplications, open, showHUD, showToast, Toast } from "@raycast/api";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const BUNDLE_ID = "com.goliney.sowiks";
const DOWNLOAD_URL = "https://sowiks.com";

/** The first release that answers the sowiks:// scheme. Older ones ignore it in silence. */
const MINIMUM_VERSION = "2.0.6";

/**
 * Runs one Sowiks command by opening its `sowiks://` URL.
 *
 * The order matters. Raycast's window is closed only once the app has been
 * found and its version checked, because a toast raised after `closeMainWindow`
 * is a toast nobody reads — which is how the equivalent extensions for other
 * capture tools end up looking broken to anyone who has not installed the app.
 */
export async function runSowiksCommand(host: string): Promise<void> {
  const app = await findSowiks();

  if (!app) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Sowiks is not installed",
      message: "These commands drive the Sowiks app for macOS.",
      primaryAction: {
        title: "Download Sowiks",
        onAction: () => {
          open(DOWNLOAD_URL);
        },
      },
    });
    return;
  }

  const version = await installedVersion(app);
  if (version && isOlderThan(version, MINIMUM_VERSION)) {
    await showToast({
      style: Toast.Style.Failure,
      title: `Update Sowiks to ${MINIMUM_VERSION} or later`,
      message: `Version ${version} is installed, and it cannot be controlled from Raycast yet.`,
      primaryAction: {
        title: "Get the Latest Version",
        onAction: () => {
          open(DOWNLOAD_URL);
        },
      },
    });
    return;
  }

  await closeMainWindow();

  try {
    // Pinned to the bundle id on purpose: URL schemes are global and unowned, so
    // another app registering "sowiks" would otherwise receive these commands.
    // `src` is telemetry only — anyone can set it, so nothing may trust it.
    await open(`sowiks://${host}?src=raycast`, BUNDLE_ID);
  } catch {
    // Launch Services can still refuse the URL — most often on a copy that has
    // never been opened, so the scheme was never registered. Raycast's window
    // is already gone by now and a toast has nowhere to appear, which is why
    // this is a HUD, and why it says what to do rather than what went wrong.
    await showHUD("Sowiks did not open — launch it once from Applications, then try again");
  }
}

/** Opens a Sowiks web page. No app needed, so no checks. */
export async function openSowiksPage(url: string): Promise<void> {
  await closeMainWindow();

  try {
    await open(url);
  } catch {
    // Same reasoning as above: the window is gone, so a HUD is the only
    // feedback left. Far less likely to happen here, but a browser that
    // refuses to launch should not fail silently either.
    await showHUD("Could not open the page in your browser");
  }
}

async function findSowiks(): Promise<Application | undefined> {
  const installed = await getApplications();
  return installed.find((app) => app.bundleId === BUNDLE_ID);
}

/**
 * `CFBundleShortVersionString` from the installed bundle.
 *
 * Read through `plutil` because a built Info.plist is usually a binary plist,
 * which cannot be parsed as text. Undefined on any failure: refusing to run a
 * command because a version could not be read would be worse than running it.
 */
async function installedVersion(app: Application): Promise<string | undefined> {
  try {
    const { stdout } = await execFileAsync("/usr/bin/plutil", [
      "-extract",
      "CFBundleShortVersionString",
      "raw",
      "-o",
      "-",
      `${app.path}/Contents/Info.plist`,
    ]);
    const version = stdout.trim();
    return version.length > 0 ? version : undefined;
  } catch {
    return undefined;
  }
}

export function isOlderThan(version: string, minimum: string): boolean {
  const parts = (value: string) => value.split(".").map((piece) => Number.parseInt(piece, 10) || 0);
  const left = parts(version);
  const right = parts(minimum);

  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const a = left[index] ?? 0;
    const b = right[index] ?? 0;
    if (a !== b) return a < b;
  }
  return false;
}
