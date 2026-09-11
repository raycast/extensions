import { resumePomodoro } from "../lib/pomodoro-engine";
import { formatTimer, getRemainingSeconds } from "../lib/pomodoro-state";

/**
 * Resume a paused Pomodoro timer.
 */
export default async function tool() {
  const state = await resumePomodoro();
  return {
    phase: state.phase,
    isRunning: state.isRunning,
    remaining: formatTimer(getRemainingSeconds(state)),
  };
}
