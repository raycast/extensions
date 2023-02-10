import * as fs from "fs";
import { getDailyLogsPath } from "../shared/getDailyLogPath";
import { LoggedDay } from "./LoggedDay";

export function getLoggedDays(): LoggedDay[] {
  const dailyLogPath = getDailyLogsPath();
  if (!fs.existsSync(dailyLogPath)) {
    return [];
  }
  return fs
    .readdirSync(dailyLogPath)
    .filter((file) => file.endsWith(".md"))
    .map((fileName) => fileName.replace(".md", ""))
    .map((fileName) => new Date(fileName))
    .sort((a, b) => b.getTime() - a.getTime())
    .map((d) => new LoggedDay(d));
}
