import { DailyLog } from "../../domain/dailyLog/DailyLog";
import { DailyLogRepository } from "../../domain/dailyLog/DailyLogRepository";
import { NewDailyLog } from "../../domain/dailyLog/NewDailyLog";

export class MigrationDayDailyLogRepository implements DailyLogRepository {
  constructor(private readonly legacy: DailyLogRepository, private readonly repository: DailyLogRepository) {}

  update(log: DailyLog): void {
    if (this.legacy.dateContainsLogs(log.date)) {
      this.migrateLogsForDate(log.date);
    }
    this.repository.update(log);
  }

  create(dailyLog: NewDailyLog): void {
    if (this.legacy.dateContainsLogs(dailyLog.date)) {
      this.migrateLogsForDate(dailyLog.date);
    }
    this.repository.create(dailyLog);
  }

  migrateLogsForDate(date: Date): void {
    this.legacy.getAllForDate(date).forEach((oldLog) => {
      this.repository.create(oldLog);
    });
    this.legacy.deleteAllForDate(date);
  }

  getAllForDate(date: Date): DailyLog[] {
    if (this.legacy.dateContainsLogs(date)) {
      this.migrateLogsForDate(date);
    }
    return this.repository.getAllForDate(date);
  }

  dateContainsLogs(date: Date): boolean {
    return this.legacy.dateContainsLogs(date) || this.repository.dateContainsLogs(date);
  }

  deleteLog(logId: string, date: Date): void {
    if (this.legacy.dateContainsLogs(date)) {
      this.migrateLogsForDate(date);
    }
    this.repository.deleteLog(logId, date);
  }

  deleteAllForDate(date: Date): void {
    if (this.legacy.dateContainsLogs(date)) {
      this.legacy.deleteAllForDate(date);
    }
    this.repository.deleteAllForDate(date);
  }
}
