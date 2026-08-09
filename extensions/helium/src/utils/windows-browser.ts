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
 * Open a URL in Helium. Chromium reuses the most recently focused window and
 * appends a new tab, and starts Helium first when it isn't running.
 */
export async function openUrlInHelium(url: string): Promise<void> {
  launchHelium([url]);
}

/** Open an empty new window. */
export async function createNewWindow(): Promise<void> {
  launchHelium(["--new-window", "about:blank"]);
}

/** Open an incognito window. */
export async function createNewIncognitoWindow(): Promise<void> {
  launchHelium(["--incognito"]);
}
