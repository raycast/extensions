import { DailyLogRepository } from "../DailyLogRepository";
import { DailyLog } from "../DailyLog";

export class EditDailyLogUseCase {
  constructor(private dailyLogRepository: DailyLogRepository) {}

  execute(log: DailyLog) {
    this.dailyLogRepository.update(log);
  }
}
