import { LoggedMonth } from "./LoggedMonth";
import { LoggedDaysRepository } from "./LoggedDaysRepository";

export class GetLoggedMonthsUseCase {
  constructor(private repository: LoggedDaysRepository) {}

  execute(): LoggedMonth[] {
    const monthsSet = new Set<string>();
    this.repository.getLoggedDays().forEach((day) => {
      const month = day.date.getMonth();
      const year = day.date.getFullYear();
      const key = `${month}-${year}`;
      if (!monthsSet.has(key)) {
        monthsSet.add(key);
      }
    });
    return Array.from(monthsSet)
      .map((key) => {
        const [month, year] = key.split("-");
        return new LoggedMonth(new Date(parseInt(year), parseInt(month)));
      })
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }
}
