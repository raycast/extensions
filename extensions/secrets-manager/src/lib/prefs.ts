import { BackupConfig, runBackup } from "./backup";

type RawPrefs = {
  enableBackups?: boolean;
  backupDir?: string;
  retention?: string;
};

export function backupConfigFrom(raw: RawPrefs, defaultDir: string): BackupConfig {
  const retention = Number.parseInt(raw.retention ?? "", 10);
  return {
    enabled: raw.enableBackups ?? true,
    dir: raw.backupDir && raw.backupDir.trim() ? raw.backupDir : defaultDir,
    retention: Number.isFinite(retention) && retention > 0 ? retention : 10,
  };
}

export function makeAfterSave(cfg: BackupConfig): (filePath: string) => Promise<void> {
  return (filePath) => runBackup(filePath, cfg);
}
