import { join } from "node:path";
import { environment, getPreferenceValues } from "@raycast/api";
import { SecretsStore } from "./store";
import { KeychainKeyStore } from "./keystore";
import { backupConfigFrom, makeAfterSave } from "./prefs";

export function getStore(): SecretsStore {
  const prefs = getPreferenceValues<{
    enableBackups?: boolean;
    backupDir?: string;
    retention?: string;
  }>();
  const defaultDir = join(environment.supportPath, "backups");
  const cfg = backupConfigFrom(prefs, defaultDir);
  const filePath = join(environment.supportPath, "secrets.enc");
  return new SecretsStore(filePath, new KeychainKeyStore(), makeAfterSave(cfg));
}
