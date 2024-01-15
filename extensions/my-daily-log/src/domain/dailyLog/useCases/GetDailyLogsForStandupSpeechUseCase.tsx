import { LoggedDaysRepository } from "../../loggedDay/LoggedDaysRepository";
import { DailyLog } from "../DailyLog";
import { DailyLogRepository } from "../DailyLogRepository";

export class GetDailyLogsForStandupSpeechUseCase {
  constructor(private logsRepository: DailyLogRepository, private loggedDaysRepository: LoggedDaysRepository) {}

  // returns all logs for the latest day and today.
  execute(): DailyLog[] {
    const allLoggedDays = this.loggedDaysRepository.getLoggedDays().sort((a, b) => a.date.getTime() - b.date.getTime());

    if (allLoggedDays.length === 0) {
      return [];
    }
    const todayLogs = this.logsRepository.getAllForDate(new Date());
    const latestDay = allLoggedDays.filter((item) => item.date.toDateString() !== new Date().toDateString()).pop();
    if (!latestDay) {
      return todayLogs;
    }
    const latestDayLogs = this.logsRepository.getAllForDate(latestDay.date);
    return [...latestDayLogs, ...todayLogs].sort((a, b) => a.date.getTime() - b.date.getTime());
  }
}
