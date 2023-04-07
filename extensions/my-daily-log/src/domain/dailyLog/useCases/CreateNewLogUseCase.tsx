import { NewDailyLog } from "../NewDailyLog";
import { DailyLogRepository } from "../DailyLogRepository";

export class CreateNewLogUseCase {
  constructor(private dailyLogRepository: DailyLogRepository) {}

  execute(title: NewDailyLog) {
    this.dailyLogRepository.create(title);
  }
}
