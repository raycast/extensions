// The engine's log, for the Open Log actions. The log is made when the engine first starts, so on the screens that
// offer it (the engine didn't start) it may not be there yet: then its folder opens, or the support folder.

import { environment, open } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { existsSync } from "node:fs";
import { join } from "node:path";

export const LOGS = join(environment.supportPath, "logs");
export const LOG_FILE = join(LOGS, "daemon.log");

/** The log if it's there, else the nearest folder that is. */
export function logTarget(): string {
  if (existsSync(LOG_FILE)) return LOG_FILE;
  return existsSync(LOGS) ? LOGS : environment.supportPath;
}

export async function openLog(): Promise<void> {
  try {
    await open(logTarget());
  } catch (error) {
    await showFailureToast(error, { title: "Couldn't open the log" });
  }
}
