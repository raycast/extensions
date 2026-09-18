import { showHUD } from "@raycast/api";
import { describeError, startSession } from "./session";
import { getAppPreferences } from "./preferences";

export default async function StartBreakCommand() {
  const { breakDuration } = getAppPreferences();

  // Stops (and logs) the current pomodoro and starts the break in one step.
  // The task it was on is offered for resume from the log when the break ends.
  const result = await startSession({
    taskTitle: "Break",
    durationMinutes: breakDuration,
    isBreak: true,
  });
  if (result.status === "busy") {
    await showHUD("⏳ Timer is busy — try again");
    return;
  }
  if (result.status === "error") {
    await showHUD(
      `⚠️ Could not start the break: ${describeError(result.error)}`,
    );
    return;
  }
  await showHUD(`☕ Break — ${breakDuration}min`);
}
