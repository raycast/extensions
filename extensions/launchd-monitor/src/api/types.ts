export interface LaunchctlListResult {
  label: string;
  lastExitStatus: number | null;
  pid: number | null;
  stdoutPath: string | null;
  stderrPath: string | null;
  program: string | null;
  loaded: boolean;
}

export interface CalendarSchedule {
  type: "calendar";
  Weekday?: number;
  Month?: number;
  Day?: number;
  Hour?: number;
  Minute?: number;
}

export interface IntervalSchedule {
  type: "interval";
  seconds: number;
}

export type JobSchedule = CalendarSchedule | IntervalSchedule;

export interface JobStatus {
  label: string;
  displayName: string;
  loaded: boolean;
  running: boolean;
  pid: number | null;
  lastExitCode: number | null;
  signal: number | null;
  success: boolean | null;
  lastRunTime: Date | null;
  nextRunTime: Date | null;
  scheduleDescription: string | null;
  stdoutPath: string | null;
  stderrPath: string | null;
  program: string | null;
  plistPath: string | null;
}

export type OverallStatus =
  | "all-ok"
  | "has-failures"
  | "has-running"
  | "not-loaded";
