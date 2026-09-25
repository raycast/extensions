import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const OSASCRIPT_BIN = "/usr/bin/osascript";

const PREFERENCE_PANES_SUPPORT = "/System/Library/PrivateFrameworks/PreferencePanesSupport.framework";

function preferencePanesScript(...lines: string[]): string {
  return [`ObjC.import("Foundation")`, `$.NSBundle.bundleWithPath("${PREFERENCE_PANES_SUPPORT}").load`, ...lines].join(
    ";\n",
  );
}

async function runPreferencePanesScript(body: string): Promise<string> {
  const { stdout } = await execFileAsync(OSASCRIPT_BIN, ["-l", "JavaScript", "-e", body]);
  return stdout;
}

/**
 * Reads the live scroll direction from the same framework the Trackpad pane uses.
 *
 * @returns Whether natural scrolling is currently on
 * @throws An error when the script fails to run or returns an unexpected value
 */
export async function isNaturalScrollingOn(): Promise<boolean> {
  const stdout = await runPreferencePanesScript(
    preferencePanesScript(`ObjC.bindFunction("swipeScrollDirection", ["bool", []])`, `$.swipeScrollDirection()`),
  );
  const value = stdout.trim();
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  throw new Error(`Unexpected scroll direction value: ${value}`);
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
  await runPreferencePanesScript(
    preferencePanesScript(
      `ObjC.bindFunction("setSwipeScrollDirection", ["void", ["bool"]])`,
      `$.setSwipeScrollDirection(${enabled})`,
    ),
  );
}
