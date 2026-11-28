import { closeMainWindow, showHUD } from "@raycast/api";
import { execFile } from "child_process";
import { join } from "path";
import { promisify } from "util";

const exec = promisify(execFile);

const bundleID = "com.esreverse.quitehandy";
/// The first version that handles quitehandy:// links.
const minimumVersion = [2, 4];

/// Asks LaunchServices, as macOS itself does: the app that opens quitehandy:// links, and the
/// app with Quite Handy's bundle identifier (an older version may be there without the links).
const lookup = `
ObjC.import("AppKit");
const ws = $.NSWorkspace.sharedWorkspace;
const handler = ws.URLForApplicationToOpenURL($.NSURL.URLWithString("quitehandy://"));
const app = ws.URLForApplicationWithBundleIdentifier("${bundleID}");
JSON.stringify({
  handler: handler.isNil() ? null : handler.path.js,
  app: app.isNil() ? null : app.path.js,
});
`;

async function apps(): Promise<{ handler: string | null; app: string | null }> {
  try {
    const { stdout } = await exec("osascript", ["-l", "JavaScript", "-e", lookup]);
    return JSON.parse(stdout);
  } catch {
    return { handler: null, app: null };
  }
}

/// The version of the app at `path`, such as [2, 4, 1], read from its Info.plist.
async function installedVersion(path: string): Promise<number[] | undefined> {
  try {
    const plist = join(path, "Contents/Info.plist");
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

/// Opens a quitehandy:// link in the background with the app macOS opens these links with:
/// Quite Handy does it without coming to the front. Only that app's version is checked. Without
/// a handler, an installed Quite Handy is older than 2.4 (it doesn't know the links yet).
export async function run(path: string) {
  await closeMainWindow();
  const { handler, app } = await apps();
  if (!handler) {
    await showHUD(app ? "Update Quite Handy to 2.4 or later" : "Quite Handy is not installed");
    return;
  }
  const version = await installedVersion(handler);
  if (version && isOlder(version, minimumVersion)) {
    await showHUD("Update Quite Handy to 2.4 or later");
    return;
  }
  await new Promise<void>((resolve) => {
    execFile("open", ["-g", "-a", handler, `quitehandy://${path}`], async (error) => {
      if (error) {
        await showHUD("Quite Handy could not be opened");
      }
      resolve();
    });
  });
}
