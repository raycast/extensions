import * as fs from "fs";
import { LoggedDay } from "../../domain/loggedDay/LoggedDay";
import { LoggedDaysRepository } from "../../domain/loggedDay/LoggedDaysRepository";
import { parseDateKey } from "../../shared/dates";

export class JsonLoggedDaysRepository implements LoggedDaysRepository {
  constructor(private readonly getLogsPath: () => string) {}

  getLoggedDays(): LoggedDay[] {
    const logsPath = this.getLogsPath();
    if (!fs.existsSync(logsPath)) {
      return [];
    }
    return fs
      .readdirSync(logsPath)
      .filter((file) => file.endsWith(".json"))
      .map((fileName) => parseDateKey(fileName.replace(/\.json$/, "")))
      .filter((date): date is Date => date !== undefined)
      .sort((a, b) => b.getTime() - a.getTime())
      .map((date) => new LoggedDay(date));
  }
}
