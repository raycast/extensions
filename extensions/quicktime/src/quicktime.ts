import { runAppleScript } from "@raycast/utils";

/** `syntax error: … (-2741)`: AppleScript could not compile the script against QuickTime's dictionary. */
const TERMINOLOGY_ERROR = "-2741";
const READY_TIMEOUT_MS = 10000;
const RETRY_DELAY_MS = 250;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function launchQuickTimePlayer() {
  try {
    // `launch` starts the app without sending it a `run` event, so no "Open File" panel shows up.
    await runAppleScript('tell application "QuickTime Player" to launch');
  } catch {
    // Falls back to Launch Services, which does not need an Apple event at all.
    await runAppleScript("do shell script \"open -g -a 'QuickTime Player'\"");
  }
}

/**
 * With QuickTime Player quit, looking up its terminology by name fails, so `new screen recording`
 * & co. cannot even be compiled: osascript exits with
 * `syntax error: Expected “,” or “)” but found identifier. (-2741)`, and the commands failed with
 * "Could not run AppleScript". That happens before the script runs, which is why wrapping it in
 * `try … end try` did not help either. (Referring to the app by full path does compile while it is
 * quit, but hardcoding a system path is worse than making sure the app is up.)
 *
 * Launch the app first, then retry until its dictionary is available.
 */
export async function runQuickTimeScript(script: string) {
  await launchQuickTimePlayer();

  const deadline = Date.now() + READY_TIMEOUT_MS;
  for (;;) {
    try {
      return await runAppleScript(script);
    } catch (error) {
      const isStillLaunching = error instanceof Error && error.message.includes(TERMINOLOGY_ERROR);
      if (!isStillLaunching || Date.now() > deadline) {
        throw error;
      }
      await delay(RETRY_DELAY_MS);
    }
  }
}
