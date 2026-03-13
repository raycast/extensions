import { DailyLog } from "../DailyLog";
import { DailyLogRepository } from "../DailyLogRepository";

export class GetDailyLogsForDateUseCase {
  constructor(private repository: DailyLogRepository) {}

  execute(date: Date): DailyLog[] {
    return this.repository.getAllForDate(date).sort((a, b) => a.date.getTime() - b.date.getTime());
  }
}
