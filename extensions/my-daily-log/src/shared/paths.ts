import { getPreferenceValues } from "@raycast/api";
import * as os from "os";
import * as path from "path";
import { toDateKey } from "./dates";

export function expandHome(filePath: string): string {
  const trimmed = filePath.trim();
  if (trimmed === "~") {
    return os.homedir();
  }
  if (trimmed.startsWith("~/")) {
    return path.join(os.homedir(), trimmed.slice(2));
  }
  return trimmed;
}

export function getDailyLogsPath(): string {
  return expandHome(getPreferenceValues<Preferences>().logPath);
}

export function getJsonDailyLogPath(date: Date): string {
  return path.join(getDailyLogsPath(), `${toDateKey(date)}.json`);
}
