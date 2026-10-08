import { DailyLog } from "../DailyLog";
import { DailyLogRepository } from "../DailyLogRepository";

export class EditDailyLogUseCase {
  constructor(private dailyLogRepository: DailyLogRepository) {}

  execute(original: DailyLog, updated: DailyLog): void {
    const title = updated.title.trim();
    if (title.length === 0) {
      throw new Error("The log can't be empty");
    }
    this.dailyLogRepository.update(original, new DailyLog(original.id, updated.date, title));
  }
}
