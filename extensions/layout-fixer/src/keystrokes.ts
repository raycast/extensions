/**
 * The two synthetic keystrokes this extension needs, on both platforms.
 *
 * Raycast can read the frontmost app's *selection*, but there is no API for
 * reading the focused text field outright. So when nothing is selected we
 * select the field's contents ourselves and read that instead.
 *
 * Both helpers shell out, which costs a process spawn (~100ms on macOS, more
 * on Windows). They are only ever reached when there is no selection, so the
 * common path never pays for them.
 */

import { runAppleScript, runPowerShellScript } from "@raycast/utils";

const IS_WINDOWS = process.platform === "win32";

/** Select everything in the focused field — ⌘A on macOS, Ctrl+A on Windows. */
export async function selectAll(): Promise<void> {
  if (IS_WINDOWS) {
    await runPowerShellScript(
      "Add-Type -AssemblyName System.Windows.Forms\n" + "[System.Windows.Forms.SendKeys]::SendWait('^a')",
    );
    return;
  }
  await runAppleScript('tell application "System Events" to keystroke "a" using command down');
}

/**
 * Collapse a selection we made but did not end up replacing. Without this a
 * bailed-out run would leave the whole field highlighted, and the user's next
 * keystroke would wipe it.
 */
export async function collapseSelection(): Promise<void> {
  if (IS_WINDOWS) {
    await runPowerShellScript(
      "Add-Type -AssemblyName System.Windows.Forms\n" + "[System.Windows.Forms.SendKeys]::SendWait('{RIGHT}')",
    );
    return;
  }
  // key code 124 is the right arrow.
  await runAppleScript('tell application "System Events" to key code 124');
}
