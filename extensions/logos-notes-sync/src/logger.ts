import * as fs from "fs";
import * as path from "path";
import { homedir } from "os";

const LOG_FILE = path.join(homedir(), "logos-notes-sync.log");

export function log(message: string, data?: unknown): void {
  const timestamp = new Date().toISOString();
  let logLine = `[${timestamp}] ${message}`;

  if (data !== undefined) {
    if (typeof data === "object") {
      try {
        logLine += `\n${JSON.stringify(data, null, 2)}`;
      } catch {
        logLine += `\n[Object: ${typeof data}]`;
      }
    } else {
      logLine += ` ${data}`;
    }
  }

  logLine += "\n";

  // Append to log file
  fs.appendFileSync(LOG_FILE, logLine);

  // Also log to console for dev mode
  console.log(logLine);
}

export function logError(message: string, error: unknown): void {
  const timestamp = new Date().toISOString();
  let logLine = `[${timestamp}] ERROR: ${message}`;

  if (error instanceof Error) {
    logLine += `\n  Message: ${error.message}`;
    logLine += `\n  Stack: ${error.stack}`;
  } else {
    logLine += `\n  ${String(error)}`;
  }

  logLine += "\n";

  fs.appendFileSync(LOG_FILE, logLine);
  console.error(logLine);
}

export function clearLog(): void {
  fs.writeFileSync(LOG_FILE, `=== Logos Notes Sync Log ===\nStarted: ${new Date().toISOString()}\n\n`);
}

export function getLogPath(): string {
  return LOG_FILE;
}
