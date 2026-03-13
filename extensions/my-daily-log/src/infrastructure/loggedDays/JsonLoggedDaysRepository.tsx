import * as fs from "fs";
import { LoggedDay } from "../../domain/loggedDay/LoggedDay";
import { LoggedDaysRepository } from "../../domain/loggedDay/LoggedDaysRepository";
import { getDailyLogsPath } from "../../shared/getDailyLogPath";

export class JsonLoggedDaysRepository implements LoggedDaysRepository {
  getLoggedDays(): LoggedDay[] {
    const dailyLogPath = getDailyLogsPath();
    if (!fs.existsSync(dailyLogPath)) {
      return [];
    }
    return fs
      .readdirSync(dailyLogPath)
      .filter((file) => file.endsWith(".json"))
      .map((fileName) => fileName.replace(".json", ""))
      .map((fileName) => new Date(fileName))
      .sort((a, b) => b.getTime() - a.getTime())
      .map((d) => new LoggedDay(d));
  }
}
