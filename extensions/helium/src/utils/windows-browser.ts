import { spawn } from "child_process";
import { requireHeliumExecutable } from "./platform";

/**
 * Windows counterpart to `applescript.ts`.
 *
 * Chromium on Windows has no scripting interface, so everything here goes
 * through the executable's command line. Arguments are passed as an array so
 * URLs never need shell quoting, and the child is detached and unref'd so
 * Helium outlives the Raycast command process.
 *
 * Reading tab state, switching tabs, and closing tabs are not expressible this
 * way — those are handled by the Browser Extension (read-only) in `browser.ts`.
 */
function launchHelium(args: string[]): void {
  const executable = requireHeliumExecutable();
  const child = spawn(executable, args, { detached: true, stdio: "ignore", windowsHide: false });
  child.unref();
}

/**
 * Helium's new tab page. Chromium accepts it on the command line, so a new
 * window lands on the real new tab page — with the search box and shortcuts —
 * rather than a blank document.
 */
const NEW_TAB_PAGE = "chrome://new-tab-page/";

/**
 * Open a URL in Helium. Chromium reuses the most recently focused window and
 * appends a new tab, and starts Helium first when it isn't running.
 */
export async function openUrlInHelium(url: string): Promise<void> {
  launchHelium([url]);
}

/**
 * Open a new tab on the new tab page. Unlike macOS AppleScript, Chromium's
 * command line accepts `chrome://` addresses, so this navigates correctly.
 */
export async function createNewTab(): Promise<void> {
  launchHelium([NEW_TAB_PAGE]);
}

/** Open a new window on the new tab page. */
export async function createNewWindow(): Promise<void> {
  launchHelium(["--new-window", NEW_TAB_PAGE]);
}

/** Open an incognito window. */
export async function createNewIncognitoWindow(): Promise<void> {
  launchHelium(["--incognito"]);
}
