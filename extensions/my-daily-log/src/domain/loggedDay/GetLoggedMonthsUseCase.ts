import { startOfMonth, toDateKey } from "../../shared/dates";
import { LoggedDaysRepository } from "./LoggedDaysRepository";
import { LoggedMonth } from "./LoggedMonth";

export class GetLoggedMonthsUseCase {
  constructor(private repository: LoggedDaysRepository) {}

  execute(): LoggedMonth[] {
    const months = new Map<string, Date>();
    this.repository.getLoggedDays().forEach((day) => {
      const month = startOfMonth(day.date);
      months.set(toDateKey(month), month);
    });
    return Array.from(months.values())
      .sort((a, b) => b.getTime() - a.getTime())
      .map((month) => new LoggedMonth(month));
  }
}
