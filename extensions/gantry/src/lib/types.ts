// ---- Raw data from launchctl list ----
export interface LaunchctlListEntry {
  pid: number | null;
  exitCode: number;
  label: string;
}

// ---- Parsed plist configuration ----
export interface CalendarInterval {
  Month?: number;
  Day?: number;
  Weekday?: number;
  Hour?: number;
  Minute?: number;
}

export interface PlistConfig {
  Label: string;
  Program?: string;
  ProgramArguments?: string[];
  StartCalendarInterval?: CalendarInterval | CalendarInterval[];
  StartInterval?: number;
  StandardOutPath?: string;
  StandardErrorPath?: string;
  RunAtLoad?: boolean;
  KeepAlive?: boolean | Record<string, unknown>;
  Disabled?: boolean;
  WorkingDirectory?: string;
  EnvironmentVariables?: Record<string, string>;
  [key: string]: unknown;
}

// ---- Parsed launchctl print output ----
export interface PrintInfo {
  state: string;
  runs: number;
  lastExitCode: number | null;
  path: string;
  program: string;
  arguments: string[];
  stdoutPath?: string;
  stderrPath?: string;
}

// ---- Schedule representation ----
export type ScheduleType =
  | "calendar"
  | "interval"
  | "on-demand"
  | "run-at-load";

export interface Schedule {
  type: ScheduleType;
  humanReadable: string;
  nextRun: Date | null;
}

// ---- Job health status ----
export type JobHealth = "healthy" | "error" | "warning" | "unknown";

// ---- Unified job model ----
export interface LaunchJob {
  label: string;
  source: "user" | "system-agent" | "system-daemon";
  plistPath: string;
  isRunning: boolean;
  pid: number | null;
  lastExitCode: number | null;
  exitCodeMeaning: string;
  runs: number;
  health: JobHealth;
  schedule: Schedule;
  program: string;
  programFull: string;
  logPaths: { stdout?: string; stderr?: string };
  config: PlistConfig;
}

// ---- Filter state ----
export type SortField = "label" | "nextRun" | "health" | "source";
export type SortDirection = "asc" | "desc";

export interface FilterState {
  searchText: string;
  healthFilter: JobHealth | "all";
  sourceFilter: LaunchJob["source"] | "all";
  showAppleServices: boolean;
  sortField: SortField;
  sortDirection: SortDirection;
}

// ---- Schedule editing ----
export type EditInputMode = "natural" | "cron";

export type EditPhase = "input" | "confirm" | "applying" | "success" | "error";

export interface ParsedSchedule {
  type: "interval" | "calendar";
  startInterval?: number;
  calendarIntervals?: CalendarInterval[];
}

export interface ScheduleParseResult {
  ok: boolean;
  schedule?: ParsedSchedule;
  humanReadable?: string;
  nextRun?: Date | null;
  error?: string;
}

export interface EditState {
  phase: EditPhase;
  inputMode: EditInputMode;
  inputText: string;
  parseResult: ScheduleParseResult | null;
  errorMessage?: string;
}
