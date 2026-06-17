import { LoggedDay } from "./LoggedDay";
import { LoggedDaysRepository } from "./LoggedDaysRepository";

export class GetLoggedDaysUseCase {
  constructor(private repository: LoggedDaysRepository) {}

  execute(): LoggedDay[] {
    return this.repository.getLoggedDays().sort((a, b) => b.date.getTime() - a.date.getTime());
  }
}
