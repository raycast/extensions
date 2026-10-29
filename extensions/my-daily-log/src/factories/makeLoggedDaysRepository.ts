import { LoggedDaysRepository } from "../domain/loggedDay/LoggedDaysRepository";
import { JsonLoggedDaysRepository } from "../infrastructure/loggedDays/JsonLoggedDaysRepository";
import { getDailyLogsPath } from "../shared/paths";
import { ensureStorageIsMigrated } from "./ensureStorageIsMigrated";

export function makeLoggedDaysRepository(): LoggedDaysRepository {
  ensureStorageIsMigrated();
  return new JsonLoggedDaysRepository(getDailyLogsPath);
}
