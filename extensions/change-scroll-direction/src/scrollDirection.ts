import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const DEFAULTS_BIN = "/usr/bin/defaults";
const OSASCRIPT_BIN = "/usr/bin/osascript";

const SCROLL_DIRECTION_KEY = "com.apple.swipescrolldirection";
const PREFERENCE_PANES_SUPPORT = "/System/Library/PrivateFrameworks/PreferencePanesSupport.framework";

/**
 * Reads the global scroll direction preference.
 *
 * @returns Whether natural scrolling is currently on
 */
export async function isNaturalScrollingOn(): Promise<boolean> {
  try {
    const { stdout } = await execFileAsync(DEFAULTS_BIN, ["read", "-g", SCROLL_DIRECTION_KEY]);
    return stdout.trim() === "1";
  } catch {
    // The key is absent on a fresh account, where macOS behaves as if it were on.
    return true;
  }
}

/**
 * Calls the same private function the Trackpad settings pane uses. It writes the
 * preference and applies it live, in one step.
 *
 * @remarks
 * Writing the preference with `defaults` instead would need `activateSettings -u`
 * to take effect, and that re-registers every system keyboard shortcut — which
 * hands ⌘Space back to Spotlight.
 *
 * @param enabled - The natural scrolling state to apply
 * @throws An error when the script fails to run
 */
export async function setNaturalScrolling(enabled: boolean): Promise<void> {
  const script = [
    `ObjC.import("Foundation")`,
    `$.NSBundle.bundleWithPath("${PREFERENCE_PANES_SUPPORT}").load`,
    `ObjC.bindFunction("setSwipeScrollDirection", ["void", ["bool"]])`,
    `$.setSwipeScrollDirection(${enabled})`,
  ].join(";\n");

  await execFileAsync(OSASCRIPT_BIN, ["-l", "JavaScript", "-e", script]);
}
