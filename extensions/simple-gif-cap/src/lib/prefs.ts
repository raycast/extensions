import { getPreferenceValues } from "@raycast/api";
import { homedir } from "node:os";
import { join } from "node:path";

export const prefs = () => getPreferenceValues<Preferences>();

export function outputDir(): string {
  const dir = prefs().outputDir?.trim() || "~/Downloads";

  return dir.startsWith("~") ? join(homedir(), dir.slice(1)) : dir;
}
