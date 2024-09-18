import { DailyLog } from "../DailyLog";
import { DailyLogRepository } from "../DailyLogRepository";

export class GetDailyLogsForMonthUseCase {
  constructor(private repository: DailyLogRepository) {}

  execute(month: Date): DailyLog[] {
    const logs: DailyLog[] = [];
    for (let day = 0; day < 31; day++) {
      const date = new Date(month.getFullYear(), month.getMonth(), day);
      logs.push(...this.repository.getAllForDate(date));
    }
    return logs;
  }
}
