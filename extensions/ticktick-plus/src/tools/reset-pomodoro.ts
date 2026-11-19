import { Action, Tool } from "@raycast/api";
import { resetPomodoro } from "../lib/pomodoro-engine";

export const confirmation: Tool.Confirmation<void> = async () => ({
  style: Action.Style.Destructive,
  message: "Reset the Pomodoro timer and drop the current session?",
});

/**
 * Reset the Pomodoro timer and drop the current TickTick focus session. Always asks for confirmation.
 */
export default async function tool() {
  const state = await resetPomodoro();
  return {
    phase: state.phase,
    isRunning: state.isRunning,
    sessionCount: state.sessionCount,
  };
}
