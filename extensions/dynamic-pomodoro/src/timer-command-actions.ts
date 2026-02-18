import { formatDuration, resetTimer, startTimer, type TimerState } from "./timer-state.ts";

export type TimerCommandActionResult = {
  nextState: TimerState;
  changed: boolean;
  hudMessage: string;
};

export function buildStartActionResult(state: TimerState, nowMs: number): TimerCommandActionResult {
  if (state.isRunning) {
    return {
      nextState: state,
      changed: false,
      hudMessage: "Timer is already running",
    };
  }

  const baselineState = state.remainingMs <= 0 ? resetTimer(state) : state;
  const startedState = startTimer(baselineState, nowMs);
  const started = startedState.isRunning;

  return {
    nextState: startedState,
    changed: started,
    hudMessage: started ? `Timer started (${formatDuration(startedState.remainingMs)})` : "Couldn't start timer",
  };
}

export function buildStopActionResult(state: TimerState): TimerCommandActionResult {
  const nextState = resetTimer(state);
  const wasAlreadyStopped = !state.isRunning && state.endsAt === null && state.remainingMs === state.minutes * 60_000;

  return {
    nextState,
    changed: !wasAlreadyStopped,
    hudMessage: wasAlreadyStopped ? "Timer is already stopped" : "Timer stopped",
  };
}
