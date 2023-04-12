import { DailyLog } from "./DailyLog";
import { NewDailyLog } from "./NewDailyLog";

export interface DailyLogRepository {
  update(log: DailyLog): void;
  create(dailyLog: NewDailyLog): void;
  getAllForDate(date: Date): DailyLog[];
  dateContainsLogs(date: Date): boolean;
  deleteLog(logId: string, date: Date): void;
  deleteAllForDate(date: Date): void;
}
