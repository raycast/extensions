import { open } from "@raycast/api";
import { spawn } from "child_process";
import { readFileSync } from "fs";
import { join } from "path";

import { BrowserApplication, getBrowserDataPath, getWindowsBrowserLaunch } from "../hooks/useAvailableBrowsers";
import { getDefaultBrowserId } from "./browsers";

type TargetBrowser = {
  id: string;
  app?: BrowserApplication;
  profile?: string;
};

type OpenBookmarkOptions = {
  url: string;
  newWindow: boolean;
  browser?: TargetBrowser;
};

/**
 * The profile the browser itself considers current. Used only when the extension's own
 * selection is empty, so that a launch never silently lands on whatever window happens
 * to be focused.
 */
function browserLastUsedProfile(browserId: string) {
  const userDataPath = getBrowserDataPath(browserId, "");

  if (!userDataPath) {
    return undefined;
  }

  try {
    const localState = JSON.parse(readFileSync(join(userDataPath, "Local State"), "utf-8"));
    const lastUsed = localState?.profile?.last_used;
    return typeof lastUsed === "string" && lastUsed.length > 0 ? lastUsed : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Launches the browser executable directly so the bookmark lands in a brand new window.
 *
 * Handing a URL to the shell (what `open` does) always reuses the last focused window of
 * whichever browser owns the protocol, which is exactly the behaviour we want to bypass.
 * Returns false when the browser could not be launched, so the caller can fall back.
 */
function launchInNewWindow(url: string, browserId: string, appPath?: string, profile?: string) {
  const launch = getWindowsBrowserLaunch(browserId, appPath);

  if (!launch) {
    return false;
  }

  const args = [...launch.newWindowArgs];

  // Pin the user data directory to the one the bookmarks were read from. Without this the
  // browser derives it from the environment, which Raycast's packaged runtime rewrites.
  if (launch.userDataDir && launch.userDataDirArg) {
    args.push(launch.userDataDirArg(launch.userDataDir));
  }

  // Without an explicit profile the browser reuses whichever one it last had open, which
  // may not be the profile the bookmark was actually read from.
  const resolvedProfile = profile || browserLastUsedProfile(browserId);

  if (resolvedProfile && launch.profileArg) {
    args.push(launch.profileArg(resolvedProfile));
  }

  args.push(url);

  try {
    // No `shell: true` — args are passed as an array so the URL can never be re-parsed
    // as a command. Detached + unref keeps the browser alive after Raycast tears us down.
    const child = spawn(launch.executable, args, { detached: true, stdio: "ignore" });
    child.unref();
    return true;
  } catch {
    return false;
  }
}

export async function openBookmark({ url, newWindow, browser }: OpenBookmarkOptions) {
  if (newWindow) {
    if (browser) {
      if (launchInNewWindow(url, browser.id, browser.app?.path, browser.profile)) {
        return;
      }
    } else {
      // "Open bookmark's browser" is off, so honour the new window request against
      // whatever the system default browser is.
      try {
        const defaultBrowserId = await getDefaultBrowserId();

        if (defaultBrowserId && launchInNewWindow(url, defaultBrowserId)) {
          return;
        }
      } catch {
        // Fall through to the shell below.
      }
    }
  }

  await open(url, browser?.app?.path ? browser.app : undefined);
}
