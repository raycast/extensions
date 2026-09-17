export type Phase = "focus" | "short-break" | "long-break";
export type TimerStatus = "idle" | "running" | "paused";

export type TimerState = {
  phase: Phase;
  status: TimerStatus;
  remainingMs: number;
  endsAt?: number;
  focusSessions: number;
  cycleSessions: number;
  lastCompletedAt?: number;
};

export type Preferences = {
  focusMinutes: string;
  shortBreakMinutes: string;
  longBreakMinutes: string;
  longBreakEvery: string;
  autoStartBreaks: boolean;
  autoStartFocus: boolean;
  sound: boolean;
};
