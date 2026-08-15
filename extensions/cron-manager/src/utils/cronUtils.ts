import { CronExpressionParser } from "cron-parser";
import { CronSchedulePreset } from "../types";

export const SCHEDULE_PRESETS: CronSchedulePreset[] = [
  { label: "Every Minute", value: "* * * * *" },
  { label: "Every 5 Minutes", value: "*/5 * * * *" },
  { label: "Every 15 Minutes", value: "*/15 * * * *" },
  { label: "Hourly", value: "0 * * * *" },
  { label: "Daily (Midnight)", value: "0 0 * * *" },
  { label: "Weekly (Sunday)", value: "0 0 * * 0" },
  { label: "Monthly (1st)", value: "0 0 1 * *" },
];

export function getNextRun(expression: string): string {
  try {
    const interval = CronExpressionParser.parse(expression);
    const nextDate = interval.next().toDate();
    return nextDate.toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "Invalid Schedule";
  }
}

export function isValidCron(expression: string): boolean {
  try {
    CronExpressionParser.parse(expression);
    return true;
  } catch {
    return false;
  }
}

export function explainCron(expression: string): string {
  const preset = SCHEDULE_PRESETS.find((p) => p.value === expression);
  if (preset) return preset.label;
  if (expression === "* * * * *") return "Every minute";
  return "Custom Schedule";
}
