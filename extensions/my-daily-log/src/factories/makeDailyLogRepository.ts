import { DailyLogRepository } from "../domain/dailyLog/DailyLogRepository";
import { JsonDailyLogRepository } from "../infrastructure/dailyLog/JsonDailyLogRepository";
import { LocalFilesDataStorage } from "../infrastructure/shared/LocalFilesDataStorage";
import { getJsonDailyLogPath } from "../shared/paths";
import { ensureStorageIsMigrated } from "./ensureStorageIsMigrated";

export function makeDailyLogRepository(): DailyLogRepository {
  ensureStorageIsMigrated();
  return new JsonDailyLogRepository(new LocalFilesDataStorage(getJsonDailyLogPath));
}
