import * as fs from "fs";
import { getDailyLogPath } from "../shared/getDailyLogPath";
import { readDailyLogs } from "./readDailyLogs";

export function getDailyLog(date: Date) {
  const dailyLogPath = getDailyLogPath(date);
  if (!fs.existsSync(dailyLogPath)) {
    return [];
  }
  return readDailyLogs(date);
}
