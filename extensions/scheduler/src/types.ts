export type ScheduleType = "once" | "15mins" | "30mins" | "hourly" | "daily" | "weekly" | "monthly" | "cron";

export type Schedule = {
  type: ScheduleType;
  date?: string; // ISO string for "once" type
  time?: string; // HH:mm format
  dayOfWeek?: number; // 0-7 for weekly (0 or 7 = Sunday, 1 = Monday, etc.)
  dayOfMonth?: number; // 1-31 for monthly
  cronExpression?: string; // Cron expression for "cron" type
};

// Simplified to store only the deeplink
export interface RaycastCommand {
  deeplink: string;
  type: "user-initiated" | "background";
  arguments?: Record<string, string> | null;
}

export type ScheduledCommand = {
  id: string;
  name: string;
  command: RaycastCommand;
  schedule: Schedule;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  lastExecutedAt?: string; // ISO string for when the command was last successfully executed
  runIfMissed?: boolean; // If true, run the command once if a scheduled execution was missed
  lastMissedCheck?: string; // ISO string for when we last checked for missed schedules
};

export interface FormValues {
  name: string;
  command: string;
  scheduleType: ScheduleType;
  date?: string;
  time: string;
  dayOfWeek?: string;
  dayOfMonth?: string;
  cronExpression?: string;
  runInBackground?: boolean;
  runIfMissed?: boolean;
}

export type CommandPermissionStatus = {
  commandKey: string; // Unique key for the command (derived from deeplink)
  hasPermission: boolean;
  lastTestedAt?: string;
  displayName: string; // Human-readable name for the command
};

export type ExecutionLog = {
  id: string;
  commandId: string;
  commandName: string;
  executedAt: string;
  status: "success" | "error";
  errorMessage?: string;
};
