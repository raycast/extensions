import { DailyLog } from "../DailyLog";
import { DailyLogRepository } from "../DailyLogRepository";
import { NewDailyLog } from "../NewDailyLog";

export class CreateNewLogUseCase {
  constructor(private dailyLogRepository: DailyLogRepository) {}

  execute(newLog: NewDailyLog): DailyLog {
    const title = newLog.title.trim();
    if (title.length === 0) {
      throw new Error("The log can't be empty");
    }
    return this.dailyLogRepository.create(new NewDailyLog(title, newLog.date));
  }
}
