import { pausePomodoro } from "../lib/pomodoro-engine";
import { formatTimer, getRemainingSeconds } from "../lib/pomodoro-state";

/**
 * Pause the running Pomodoro timer.
 */
export default async function tool() {
  const state = await pausePomodoro();
  return {
    phase: state.phase,
    isRunning: state.isRunning,
    remaining: formatTimer(getRemainingSeconds(state)),
  };
}
