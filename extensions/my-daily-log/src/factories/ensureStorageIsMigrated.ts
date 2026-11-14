import { migrateLogsToLocalDates } from "../infrastructure/migrations/migrateLogsToLocalDates";
import { getDailyLogsPath } from "../shared/paths";

let migratedPath: string | undefined;

export function ensureStorageIsMigrated() {
  const logsPath = getDailyLogsPath();
  if (migratedPath === logsPath) {
    return;
  }
  migrateLogsToLocalDates(logsPath);
  migratedPath = logsPath;
}
