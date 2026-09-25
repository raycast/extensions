import { randomUUID } from "crypto";
import { DailyLog } from "../../domain/dailyLog/DailyLog";
import { DailyLogRepository } from "../../domain/dailyLog/DailyLogRepository";
import { NewDailyLog } from "../../domain/dailyLog/NewDailyLog";
import { isSameDay } from "../../shared/dates";
import { DataStorage } from "../shared/DataStorage";
import { parseStoredLogs } from "./storedLogs";

export class JsonDailyLogRepository implements DailyLogRepository {
  constructor(private readonly dataStorage: DataStorage) {}

  private saveLogs(logs: DailyLog[], date: Date): void {
    if (logs.length === 0) {
      this.dataStorage.deleteAllDataForDate(date);
      return;
    }
    const sortedLogs = [...logs].sort((a, b) => a.date.getTime() - b.date.getTime());
    this.dataStorage.save(JSON.stringify(sortedLogs, null, 2), date);
  }

  update(original: DailyLog, updated: DailyLog): void {
    if (!isSameDay(original.date, updated.date)) {
      this.deleteLog(original);
    }
    const logsWithoutUpdated = this.getAllForDate(updated.date).filter((log) => log.id !== updated.id);
    this.saveLogs([...logsWithoutUpdated, updated], updated.date);
  }

  create(dailyLog: NewDailyLog): DailyLog {
    const newLog = new DailyLog(randomUUID(), dailyLog.date, dailyLog.title);
    this.saveLogs([...this.getAllForDate(dailyLog.date), newLog], dailyLog.date);
    return newLog;
  }

  getAllForDate(date: Date): DailyLog[] {
    if (!this.dataStorage.dataForDateExists(date)) {
      return [];
    }
    try {
      return parseStoredLogs(this.dataStorage.readForDate(date));
    } catch (error) {
      throw new Error(
        `Could not read ${this.dataStorage.describeLocation(date)}: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  dateContainsLogs(date: Date): boolean {
    return this.getAllForDate(date).length > 0;
  }

  deleteLog(log: DailyLog): void {
    this.saveLogs(
      this.getAllForDate(log.date).filter((item) => item.id !== log.id),
      log.date,
    );
  }

  deleteAllForDate(date: Date): void {
    this.dataStorage.deleteAllDataForDate(date);
  }
}
