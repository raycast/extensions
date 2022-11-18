import * as fs from "fs";
import { getDailyLogPath } from "../shared/getDailyLogPath";
import { DailyLog } from "./DailyLog";
import { dailyLogFromLogLine } from "./dailyLogFromLogLine";

export function readDailyLogs(date: Date): DailyLog[] {
  return fs
    .readFileSync(getDailyLogPath(date), "utf8")
    .split("\n")
    .filter((line) => line.length > 0)
    .map((line) => dailyLogFromLogLine(line, date));
}
