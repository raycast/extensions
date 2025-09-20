import { v4 as uuid } from "uuid";
import { NewDailyLog } from "../../domain/dailyLog/NewDailyLog";
import { DailyLog } from "../../domain/dailyLog/DailyLog";
import { DailyLogRepository } from "../../domain/dailyLog/DailyLogRepository";
import { DataStorage } from "../shared/DataStorage";

export class JsonDailyLogRepository implements DailyLogRepository {
  constructor(private readonly dataStorage: DataStorage) {}

  private saveLogs(logs: DailyLog[], date: Date): void {
    const logsJson = JSON.stringify(logs);
    this.dataStorage.save(logsJson, date);
  }

  update(log: DailyLog): void {
    const logsWithoutUpdated = this.getAllForDate(log.date).filter((l) => l.id !== log.id);
    logsWithoutUpdated.push(log);
    this.saveLogs(logsWithoutUpdated, log.date);
  }

  create(dailyLog: NewDailyLog): void {
    const allLogsForDate = this.getAllForDate(dailyLog.date);
    const newLog = new DailyLog(uuid(), dailyLog.date, dailyLog.title);
    allLogsForDate.push(newLog);
    this.saveLogs(allLogsForDate, dailyLog.date);
  }

  getAllForDate(date: Date): DailyLog[] {
    if (!this.dataStorage.dataForDateExists(date)) {
      return [];
    }
    const logsJson = this.dataStorage.readForDate(date);
    return JSON.parse(logsJson).map((log: any) => new DailyLog(log.id, new Date(log.date), log.title));
  }

  dateContainsLogs(date: Date): boolean {
    return this.getAllForDate(date).length > 0;
  }

  deleteLog(logId: string, date: Date): void {
    const allLogsForDate = this.getAllForDate(date);
    const logsWithoutDeleted = allLogsForDate.filter((log) => log.id !== logId);
    this.saveLogs(logsWithoutDeleted, date);
  }

  deleteAllForDate(date: Date): void {
    this.dataStorage.deleteAllDataForDate(date);
  }
}
