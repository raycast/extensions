import { getDailyLogPath } from "../../shared/getDailyLogPath";
import * as fs from "fs";
import { v4 as uuid } from "uuid";
import { DailyLog } from "../../domain/dailyLog/DailyLog";
import { DailyLogRepository } from "../../domain/dailyLog/DailyLogRepository";
import { NewDailyLog } from "../../domain/dailyLog/NewDailyLog";

export class LegacyDailyLogRepository implements DailyLogRepository {
  private readDailyLogs(date: Date): DailyLog[] {
    return fs
      .readFileSync(getDailyLogPath(date), "utf8")
      .split("\n")
      .filter((line) => line.length > 0)
      .map((line) => this.dailyLogFromLogLine(line, date));
  }

  private dailyLogFromLogLine(line: string, date: Date): DailyLog {
    const [time, title] = line.split(": ");
    const [hour, minute, second] = time.split(" ")[1].split(":");
    const logDate = new Date(date);
    logDate.setHours(parseInt(hour));
    logDate.setMinutes(parseInt(minute));
    logDate.setSeconds(parseInt(second));
    return new DailyLog(uuid(), logDate, title);
  }

  update(log: DailyLog): void {
    // Not supported
  }

  getAllForDate(date: Date): DailyLog[] {
    if (!fs.existsSync(getDailyLogPath(date))) {
      return [];
    }
    return this.readDailyLogs(date);
  }

  dateContainsLogs(date: Date): boolean {
    return this.getAllForDate(date).length > 0;
  }

  deleteLog(logId: string, date: Date): void {
    // Not supported
  }

  deleteAllForDate(date: Date): void {
    if (!fs.existsSync(getDailyLogPath(date))) {
      return;
    }
    fs.rmSync(getDailyLogPath(date));
  }

  create(dailyLog: NewDailyLog): void {
    // Not supported
  }
}
