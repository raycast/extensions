import { DailyLog } from "./DailyLog";
import { NewDailyLog } from "./NewDailyLog";

export interface DailyLogRepository {
  create(dailyLog: NewDailyLog): DailyLog;
  /** Replaces `original` with `updated`, moving it to another day when its date changed. */
  update(original: DailyLog, updated: DailyLog): void;
  getAllForDate(date: Date): DailyLog[];
  dateContainsLogs(date: Date): boolean;
  deleteLog(log: DailyLog): void;
  deleteAllForDate(date: Date): void;
}
