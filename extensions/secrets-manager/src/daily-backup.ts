import { join } from "node:path";
import { environment, getPreferenceValues } from "@raycast/api";
import { runBackup } from "./lib/backup";
import { backupConfigFrom } from "./lib/prefs";

export default async function DailyBackup() {
  const prefs = getPreferenceValues<{
    enableBackups?: boolean;
    backupDir?: string;
    retention?: string;
    dailyBackup?: boolean;
  }>();
  if (!prefs.dailyBackup) return;

  const defaultDir = join(environment.supportPath, "backups");
  const cfg = backupConfigFrom(prefs, defaultDir);
  await runBackup(join(environment.supportPath, "secrets.enc"), { ...cfg, enabled: true });
}
