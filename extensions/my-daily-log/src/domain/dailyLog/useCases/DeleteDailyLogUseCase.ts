import { DailyLog } from "../DailyLog";
import { DailyLogRepository } from "../DailyLogRepository";

export class DeleteDailyLogUseCase {
  constructor(private dailyLogRepository: DailyLogRepository) {}

  execute(log: DailyLog): void {
    this.dailyLogRepository.deleteLog(log);
  }
}
