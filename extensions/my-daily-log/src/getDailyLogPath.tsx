import { getPreferenceValues } from "@raycast/api";
import { dailyLogDateForFileName } from "./dailyLogDateForFileName";

export function getDailyLogPath(date: Date) {
  const dateStr = dailyLogDateForFileName(date);
  const homePath = process.env.HOME;
  const configuredLogPath = getPreferenceValues().logPath.replace("~", homePath);
  return `${configuredLogPath}/${dateStr}.md`;
}
