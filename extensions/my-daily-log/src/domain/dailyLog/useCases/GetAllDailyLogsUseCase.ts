import { LoggedDaysRepository } from "../../loggedDay/LoggedDaysRepository";
import { DailyLog } from "../DailyLog";
import { DailyLogRepository } from "../DailyLogRepository";

export class GetAllDailyLogsUseCase {
  constructor(
    private logsRepository: DailyLogRepository,
    private loggedDaysRepository: LoggedDaysRepository,
  ) {}

  /** Every log ever written, newest first. */
  execute(): DailyLog[] {
    return this.loggedDaysRepository
      .getLoggedDays()
      .flatMap((day) => this.logsRepository.getAllForDate(day.date))
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }
}
