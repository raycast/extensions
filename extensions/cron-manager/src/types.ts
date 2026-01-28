export interface CronJob {
  id: string;
  name: string;
  schedule: string;
  command: string;
  lastRun: string | null;
  nextRun: string | null;
  status: "active" | "paused" | "failed";
  type: "custom" | "backup" | "maintenance" | "report" | "system";
}

export interface Log {
  id: string;
  jobId: string;
  time: string;
  message: string;
  type: "success" | "error" | "info";
}

export type CronSchedulePreset = {
  label: string;
  value: string;
};
