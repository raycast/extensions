export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6; // Sunday = 0

export type FocusMode = "block" | "allow";

export type FocusSchedule = {
  id: string;
  name: string;
  days: Weekday[];
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  goal: string;
  mode: FocusMode;
  categories: string[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ScheduleRuntimeState = {
  /** scheduleId -> ISO date (YYYY-MM-DD) of last start */
  lastStartedDate: Record<string, string>;
  /** scheduleId currently holding an active session started by this extension */
  activeScheduleId?: string;
  /** YYYY-MM-DD when the active session was started */
  activeStartedDate?: string;
};

export type ScheduleFormValues = {
  name: string;
  days: string[];
  startTime: string;
  endTime: string;
  goal: string;
  mode: string;
  categories: string[];
  enabled: boolean;
};
