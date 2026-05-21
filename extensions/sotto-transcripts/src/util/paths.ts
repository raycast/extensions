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
  const trimmed = override?.trim();
  if (!trimmed) return DEFAULT_HISTORY_PATH;
  if (trimmed.startsWith("~/")) return join(homedir(), trimmed.slice(2));
  if (trimmed === "~") return homedir();
  return trimmed;
}
