import { DailyLogRepository } from "../domain/dailyLog/DailyLogRepository";
import { JsonDailyLogRepository } from "../infrastructure/dailyLog/JsonDailyLogRepository";
import { LegacyDailyLogRepository } from "../infrastructure/dailyLog/LegacyDailyLogRepository";
import { MigrationDayDailyLogRepository } from "../infrastructure/dailyLog/MigrationDayDailyLogRepository";

export function makeDailyLogRepository(): DailyLogRepository {
  return new MigrationDayDailyLogRepository(new LegacyDailyLogRepository(), new JsonDailyLogRepository());
}
