import { homedir } from "node:os";
import { join } from "node:path";
import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  passwordStoreDir?: string;
}

export function resolveStorePath(): string {
  const { passwordStoreDir } = getPreferenceValues<Preferences>();
  return passwordStoreDir?.trim() || join(homedir(), ".password-store");
}
