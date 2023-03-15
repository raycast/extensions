import { LoggedDay } from "../../domain/loggedDay/LoggedDay";
import { LoggedDaysRepository } from "../../domain/loggedDay/LoggedDaysRepository";

export class LoggedDaysRepositoryComposer implements LoggedDaysRepository {
  constructor(private repositories: LoggedDaysRepository[]) {}

  getLoggedDays(): LoggedDay[] {
    const allLoggedDays = this.repositories.map((repository) => repository.getLoggedDays()).flat();
    return allLoggedDays.filter(
      (loggedDay, index, self) => index === self.findIndex((t) => t.date.getTime() === loggedDay.date.getTime())
    );
  }
}
