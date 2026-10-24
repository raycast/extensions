import { formatTimer, getRemainingSeconds, loadPomodoroState } from "../lib/pomodoro-state";

/**
 * Get the current Pomodoro timer status.
 */
export default async function tool() {
  const state = await loadPomodoroState();
  return {
    phase: state.phase,
    isRunning: state.isRunning,
    remaining: formatTimer(getRemainingSeconds(state)),
    sessionCount: state.sessionCount,
    linkedTaskId: state.linkedTaskId,
    linkedTaskTitle: state.linkedTaskTitle,
    ticktickSynced: state.ticktickSynced,
  };
}
