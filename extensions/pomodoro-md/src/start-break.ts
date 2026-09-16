import { showHUD } from "@raycast/api";
import { startBreak } from "./timer";
import { stopRunning } from "./session";
import { getAppPreferences } from "./preferences";

export default async function StartBreakCommand() {
  const { breakDuration } = getAppPreferences();

  // Stop (and log) the current pomodoro. The task it was on is offered for
  // resume from the log when the break ends.
  await stopRunning();
  await startBreak(breakDuration);
  await showHUD(`☕ Break — ${breakDuration}min`);
}
