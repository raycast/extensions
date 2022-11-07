import * as fs from "fs";
import { DailyLog } from "./DailyLog";
import { getDailyLogPath } from "./getDailyLogPath";

export function getDailyLog(date: Date) {
  const dailyLogPath = getDailyLogPath(date);
  if (!fs.existsSync(dailyLogPath)) {
    return [];
  }
  return readDailyLogs(date);
}

function readDailyLogs(date: Date) {
  return fs.readFileSync(getDailyLogPath(date), "utf8")
    .split("\n")
    .filter((line) => line.length > 0)
    .map((line) => dailyLogFromLogLine(line, date));
}

function dailyLogFromLogLine(line: string, date: Date) {
  const [time, title] = line.split(": ");
  const [hour, minute, second] = time.split(" ")[1].split(":");
  const logDate = new Date(date);
  logDate.setHours(parseInt(hour));
  logDate.setMinutes(parseInt(minute));
  logDate.setSeconds(parseInt(second));
  return new DailyLog(logDate, title);
}
