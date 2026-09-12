import { getPreferenceValues } from "@raycast/api";
import { dailyLogDateForFileName } from "./dailyLogDateForFileName";

export function getDailyLogPath(date: Date): string {
  const dateStr = dailyLogDateForFileName(date);
  const logsPath = getDailyLogsPath();
  return `${logsPath}/${dateStr}.md`;
}

export function getJsonDailyLogPath(date: Date): string {
  const dateStr = dailyLogDateForFileName(date);
  const logsPath = getDailyLogsPath();
  return `${logsPath}/${dateStr}.json`;
}

export function getDailyLogsPath(): string {
  const homePath = process.env.HOME;
  return getPreferenceValues().logPath.replace("~", homePath);
}
