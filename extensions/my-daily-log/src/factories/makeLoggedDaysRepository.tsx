import { LoggedDaysRepository } from "../domain/loggedDay/LoggedDaysRepository";
import { JsonLoggedDaysRepository } from "../infrastructure/loggedDays/JsonLoggedDaysRepository";
import { LegacyLoggedDaysRepository } from "../infrastructure/loggedDays/LegacyLoggedDaysRepository";
import { LoggedDaysRepositoryComposer } from "../infrastructure/loggedDays/LoggedDaysRepositoryComposer";

export function makeLoggedDaysRepository(): LoggedDaysRepository {
  return new LoggedDaysRepositoryComposer([new LegacyLoggedDaysRepository(), new JsonLoggedDaysRepository()]);
}
