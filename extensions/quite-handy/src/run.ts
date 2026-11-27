import { closeMainWindow, showHUD } from "@raycast/api";
import { execFile } from "child_process";
import { existsSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { promisify } from "util";

const exec = promisify(execFile);

const bundleID = "com.esreverse.quitehandy";
/// The first version that handles quitehandy:// links.
const minimumVersion = [2, 4];

/// Where Quite Handy is installed: the usual places first, then wherever Spotlight finds it.
async function appPath(): Promise<string | undefined> {
  const usual = ["/Applications/QuiteHandy.app", join(homedir(), "Applications/QuiteHandy.app")];
  const found = usual.find((path) => existsSync(path));
  if (found) {
    return found;
  }
  try {
    const { stdout } = await exec("mdfind", [`kMDItemCFBundleIdentifier == '${bundleID}'`]);
    return stdout.split("\n").find((path) => path.endsWith(".app"));
  } catch {
    return undefined;
  }
}

/// The installed version, such as [2, 4, 1], read from the app's Info.plist.
async function installedVersion(app: string): Promise<number[] | undefined> {
  try {
    const plist = join(app, "Contents/Info.plist");
    const { stdout } = await exec("plutil", ["-extract", "CFBundleShortVersionString", "raw", "-o", "-", plist]);
    return stdout.trim().split(".").map(Number);
  } catch {
    return undefined;
  }
}

function isOlder(version: number[], than: number[]): boolean {
  for (let i = 0; i < Math.max(version.length, than.length); i++) {
    const a = version[i] ?? 0;
    const b = than[i] ?? 0;
    if (a !== b) {
      return a < b;
    }
  }
  return false;
}

/// Opens a quitehandy:// link in the background: Quite Handy does it without coming to the front.
/// Without Quite Handy, or with a version older than 2.4 that doesn't know the links, it says so.
export async function run(path: string) {
  await closeMainWindow();
  const app = await appPath();
  if (!app) {
    await showHUD("Quite Handy is not installed");
    return;
  }
  const version = await installedVersion(app);
  if (version && isOlder(version, minimumVersion)) {
    await showHUD("Update Quite Handy to 2.4 or later");
    return;
  }
  await new Promise<void>((resolve) => {
    execFile("open", ["-g", `quitehandy://${path}`], async (error) => {
      if (error) {
        await showHUD("Quite Handy is not installed");
      }
      resolve();
    });
  });
}
