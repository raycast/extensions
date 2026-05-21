import { homedir } from "node:os";
import { join } from "node:path";

const DEFAULT_HISTORY_PATH = join(
  homedir(),
  "Library",
  "Containers",
  "com.kitze.sotto",
  "Data",
  "Library",
  "Application Support",
  "com.kitze.sotto",
  "recording-history.json",
);

export function resolveHistoryPath(override?: string): string {
  return override?.trim() || DEFAULT_HISTORY_PATH;
}
