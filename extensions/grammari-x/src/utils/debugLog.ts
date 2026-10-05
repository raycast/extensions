import { environment } from "@raycast/api";
import { appendFileSync } from "fs";
import { join } from "path";

const LOG_FILE = "grammarix-debug.log";

/**
 * Appends a line to a log file inside the extension's support directory.
 * Raycast does not forward extension console output to its own log files, so this
 * is the only way to inspect what happened after a command has already exited.
 */
export function logDebug(message: string) {
  try {
    appendFileSync(join(environment.supportPath, LOG_FILE), `[${new Date().toISOString()}] ${message}\n`);
  } catch {
    // logging must never break the command
  }
}

export function getDebugLogPath(): string {
  return join(environment.supportPath, LOG_FILE);
}
