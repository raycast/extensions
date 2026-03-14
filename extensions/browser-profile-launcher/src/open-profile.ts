import { LaunchProps, showHUD } from "@raycast/api";
import { execFile } from "child_process";
import { promisify } from "util";
import { getBrowserById } from "./browsers";
import { getOpenWindows, probeWindowProfiles, focusWindowByTitle, isProcessRunning } from "./window-manager";
import { OpenProfileContext } from "./types";

const execFileAsync = promisify(execFile);

export default async function OpenProfile(props: LaunchProps<{ launchContext: OpenProfileContext }>) {
  const context = props.launchContext;

  if (!context) {
    await showHUD("No profile specified");
    return;
  }

  const browser = getBrowserById(context.browserId);

  if (!browser) {
    await showHUD(`Browser "${context.browserId}" is not configured`);
    return;
  }

  await openOrFocusProfile(
    browser.name,
    browser.processName,
    browser.profileRootPath,
    context.profileDirectory,
    context.displayName,
  );
}

export async function openOrFocusProfile(
  browserName: string,
  processName: string,
  profileRootPath: string,
  profileDirectory: string,
  displayName: string,
): Promise<void> {
  const running = await isProcessRunning(processName);

  if (running) {
    // Probe windows to find which one belongs to the requested profile
    const windows = await getOpenWindows(browserName);
    const probed = await probeWindowProfiles(browserName, windows, profileRootPath);
    const match = probed.find((w) => w.profileDirectory === profileDirectory);

    if (match) {
      await focusWindowByTitle(browserName, match.title);
      await showHUD(`Focused ${displayName}`);
    } else {
      // No window for this profile — open a new one
      try {
        await execFileAsync("open", ["-a", browserName, "--args", `--profile-directory=${profileDirectory}`]);
        await showHUD(`Opened ${displayName} — ${browserName}`);
      } catch {
        await showHUD(`Failed to open ${displayName}`);
      }
    }
  } else {
    // Browser not running — launch with the specific profile
    try {
      await execFileAsync("open", ["-a", browserName, "--args", `--profile-directory=${profileDirectory}`]);
      await showHUD(`Opened ${displayName} — ${browserName}`);
    } catch {
      await showHUD(`${browserName} is not installed`);
    }
  }
}
