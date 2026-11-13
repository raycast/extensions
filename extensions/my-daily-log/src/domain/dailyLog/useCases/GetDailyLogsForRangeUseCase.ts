import { eachDay } from "../../../shared/dates";
import { DailyLog } from "../DailyLog";
import { DailyLogRepository } from "../DailyLogRepository";

export class GetDailyLogsForRangeUseCase {
  constructor(private repository: DailyLogRepository) {}

  /** All logs between `from` and `to` (both days included), oldest first. */
  execute(from: Date, to: Date): DailyLog[] {
    return eachDay(from, to)
      .flatMap((day) => this.repository.getAllForDate(day))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }
}
