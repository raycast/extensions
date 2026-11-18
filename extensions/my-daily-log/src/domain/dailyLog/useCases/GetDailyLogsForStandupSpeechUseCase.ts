import { isToday } from "../../../shared/dates";
import { LoggedDaysRepository } from "../../loggedDay/LoggedDaysRepository";
import { DailyLog } from "../DailyLog";
import { DailyLogRepository } from "../DailyLogRepository";

export type StandupLogs = { previousDay?: { date: Date; logs: DailyLog[] }; today: DailyLog[] };

export class GetDailyLogsForStandupSpeechUseCase {
  constructor(
    private logsRepository: DailyLogRepository,
    private loggedDaysRepository: LoggedDaysRepository,
  ) {}

  /** Logs of today and of the latest day logged before today. */
  execute(): StandupLogs {
    const today = this.sorted(this.logsRepository.getAllForDate(new Date()));
    const latestDay = this.loggedDaysRepository
      .getLoggedDays()
      .filter((day) => !isToday(day.date) && day.date.getTime() < Date.now())
      .sort((a, b) => b.date.getTime() - a.date.getTime())[0];

    if (!latestDay) {
      return { today };
    }
    return {
      previousDay: { date: latestDay.date, logs: this.sorted(this.logsRepository.getAllForDate(latestDay.date)) },
      today,
    };
  }

  private sorted(logs: DailyLog[]): DailyLog[] {
    return logs.sort((a, b) => a.date.getTime() - b.date.getTime());
  }
}
