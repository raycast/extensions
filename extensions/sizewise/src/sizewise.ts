import { environment, getApplications, open, showHUD, Toast } from "@raycast/api";
import { runAppleScript, showFailureToast } from "@raycast/utils";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { folderName, folderStatus } from "./paths";
import { parseVolumes, Volume } from "./volumes";

/** Sizewise's `CFBundleIdentifier`, from `App/Info.plist`. */
export const sizewiseBundleIdentifier = "me.wickstrom.Sizewise";

/** Sizewise's website, where it can be downloaded. */
export const sizewiseWebsite = "https://getsizewise.app";

/**
 * A failure the person can fix, with a toast title, a message that says what to do next, and
 * optionally a button that opens the place to fix it.
 */
export class ScanError extends Error {
  constructor(
    readonly title: string,
    message: string,
    readonly fix?: { title: string; url: string },
  ) {
    super(message);
  }
}

/**
 * Opens a folder with Sizewise, which scans it the same way as a folder dropped on its Dock icon.
 * Opening it this way, rather than with a URL scheme, also gives a sandboxed Sizewise access to
 * the folder.
 */
export async function scanWithSizewise(path: string, name: string = folderName(path)): Promise<void> {
  await openInSizewise(path);
  await showHUD(`Scanning ${name} in Sizewise`);
}

/** Scans a folder in Sizewise, or shows a failure toast that says what to do next. */
export async function scanOrShowFailure(path: string): Promise<void> {
  try {
    await scanWithSizewise(path);
  } catch (error) {
    await showScanFailure(error, "Couldn't open Sizewise");
  }
}

/** Shows a failure toast, with the `ScanError`'s title and its button when it has one. */
export async function showScanFailure(error: unknown, fallbackTitle: string): Promise<void> {
  if (!(error instanceof ScanError)) {
    await showFailureToast(error, { title: fallbackTitle });
    return;
  }
  const { fix } = error;
  const primaryAction: Toast.ActionOptions | undefined =
    fix === undefined ? undefined : { title: fix.title, onAction: () => open(fix.url) };
  await showFailureToast(error, { title: error.title, primaryAction });
}

/** Opens a folder with Sizewise like `scanWithSizewise`, without closing Raycast's window. */
export async function openInSizewise(path: string): Promise<void> {
  await requireFolder(path);
  try {
    await open(path, sizewiseBundleIdentifier);
  } catch (error) {
    // Looking through every app is slow, so it happens only to explain a failure.
    const applications = await getApplications();
    if (!applications.some((application) => application.bundleId === sizewiseBundleIdentifier)) {
      throw new ScanError(
        "Sizewise isn't installed",
        `Download it from ${sizewiseWebsite.replace("https://", "")}, then try again.`,
        { title: "Download Sizewise", url: sizewiseWebsite },
      );
    }
    throw error;
  }
}

async function requireFolder(path: string): Promise<void> {
  switch (await folderStatus(path)) {
    case "missing":
      throw new ScanError(
        `Can't find ${folderName(path)}`,
        "It may have been moved, renamed, or ejected. Choose where it is now, or connect its disk.",
      );
    case "notFolder":
      throw new ScanError("Sizewise scans folders and disks", "Choose a folder and try again.");
    case "folder":
    case "unreadable":
      return;
  }
}

/** `true` when `path` is a folder, or a location Raycast can't read that Sizewise may be able to. */
export async function isScannable(path: string): Promise<boolean> {
  const status = await folderStatus(path);
  return status === "folder" || status === "unreadable";
}

/** The volumes mounted on this Mac, as Sizewise lists them. See `assets/mounted-volumes.js`. */
export async function mountedVolumes(): Promise<Volume[]> {
  const script = await readFile(join(environment.assetsPath, "mounted-volumes.js"), "utf8");
  return parseVolumes(await runAppleScript(script, { language: "JavaScript" }));
}
