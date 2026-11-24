import { startOfWeek, toDateKey } from "../../shared/dates";
import { LoggedDaysRepository } from "./LoggedDaysRepository";
import { LoggedWeek } from "./LoggedWeek";

export class GetLoggedWeeksUseCase {
  constructor(private repository: LoggedDaysRepository) {}

  execute(): LoggedWeek[] {
    const weeks = new Map<string, Date>();
    this.repository.getLoggedDays().forEach((day) => {
      const week = startOfWeek(day.date);
      weeks.set(toDateKey(week), week);
    });
    return Array.from(weeks.values())
      .sort((a, b) => b.getTime() - a.getTime())
      .map((week) => new LoggedWeek(week));
  }
}
