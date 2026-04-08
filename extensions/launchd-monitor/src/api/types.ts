export interface LaunchctlListResult {
  label: string;
  lastExitStatus: number;
  stdoutPath: string | null;
  stderrPath: string | null;
  program: string | null;
  loaded: boolean;
}

export interface JobSchedule {
  Weekday?: number;
  Month?: number;
  Day?: number;
  Hour?: number;
  Minute?: number;
}

export interface JobStatus {
  label: string;
  displayName: string;
  loaded: boolean;
  lastExitCode: number | null;
  signal: number | null;
  success: boolean | null;
  lastRunTime: Date | null;
  nextRunTime: Date | null;
  scheduleDescription: string | null;
  stdoutPath: string | null;
  stderrPath: string | null;
  program: string | null;
  plistPath: string;
}

export type OverallStatus = "all-ok" | "has-failures" | "not-loaded";
