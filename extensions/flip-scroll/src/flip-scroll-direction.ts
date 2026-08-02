import { showHUD } from "@raycast/api";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const DEFAULTS_BIN = "/usr/bin/defaults";
const OSASCRIPT_BIN = "/usr/bin/osascript";

const SCROLL_DIRECTION_KEY = "com.apple.swipescrolldirection";
const PREFERENCE_PANES_SUPPORT =
  "/System/Library/PrivateFrameworks/PreferencePanesSupport.framework";

async function isNaturalScrollingOn(): Promise<boolean> {
  try {
    const { stdout } = await execFileAsync(DEFAULTS_BIN, [
      "read",
      "-g",
      SCROLL_DIRECTION_KEY,
    ]);
    return stdout.trim() === "1";
  } catch {
    // Key is absent on a fresh account, where macOS behaves as if it were on.
    return true;
  }
}

/**
 * Calls the same private function the Trackpad settings pane uses. It writes the
 * preference and applies it live, in one step.
 *
 * Writing the preference with `defaults` instead would need `activateSettings -u`
 * to take effect, and that re-registers every system keyboard shortcut — which
 * hands ⌘Space back to Spotlight.
 */
async function setNaturalScrolling(enabled: boolean): Promise<void> {
  const script = [
    `ObjC.import("Foundation")`,
    `$.NSBundle.bundleWithPath("${PREFERENCE_PANES_SUPPORT}").load`,
    `ObjC.bindFunction("setSwipeScrollDirection", ["void", ["bool"]])`,
    `$.setSwipeScrollDirection(${enabled})`,
  ].join(";\n");

  await execFileAsync(OSASCRIPT_BIN, ["-l", "JavaScript", "-e", script]);
}

export default async function Command() {
  try {
    const enable = !(await isNaturalScrollingOn());
    await setNaturalScrolling(enable);

    await showHUD(
      enable
        ? "Natural scrolling ON (trackpad)"
        : "Natural scrolling OFF (mouse)",
    );
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    await showHUD(`Could not change scroll direction: ${reason}`);
  }
}
