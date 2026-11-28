import type { WorkLog } from "./types";

export type WorkLogMigrationStorage = {
  getItem(key: string): Promise<string | undefined>;
  setItem(key: string, value: string): Promise<void>;
};

export async function copyMissingLegacyWorkLogs(
  legacyWorkLogs: WorkLog[],
  storage: WorkLogMigrationStorage,
  getWorkLogKey: (id: string) => string,
): Promise<void> {
  for (const workLog of legacyWorkLogs) {
    const key = getWorkLogKey(workLog.id);
    const existingWorkLog = await storage.getItem(key);
    if (existingWorkLog !== undefined) continue;

    await storage.setItem(key, JSON.stringify(workLog));
  }
}
