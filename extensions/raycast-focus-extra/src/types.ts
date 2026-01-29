/**
 * A focus session as shown in the UI (from Calendar or derived from log).
 */
export type FocusSession = {
  title: string;
  start: Date;
  end: Date;
  durationMinutes?: number;
};

/**
 * Start event from macOS unified log (Raycast Focus).
 */
export type StartEvent = {
  type: "start";
  goal: string;
  start: Date;
};

/**
 * Summary event from log when a focus session completes (carries end time; duration computed in matchSessions).
 */
export type SummaryEvent = {
  type: "summary";
  endTime: Date;
};

export type LogEvent = StartEvent | SummaryEvent;

/**
 * Focus session: goal, start (ISO string), duration (minutes).
 * Used for Storage and everywhere (parse start when you need a Date).
 */
export type StoredSession = {
  goal: string;
  start: string;
  duration: number;
};
