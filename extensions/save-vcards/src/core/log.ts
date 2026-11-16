// Debug log at ~/Library/Logs/SaveVCards.log (Console.app or `tail -f`).
// By default it records only steps, timings and errors. Names, emails and other contact data
// are written only while the "Debug Logging" preference is on. Capped at 1 MB (one rollover).
import { getPreferenceValues } from "@raycast/api";
import { appendFileSync, mkdirSync, renameSync, statSync } from "node:fs";
import os from "node:os";
import path from "node:path";

export const LOG_FILE = path.join(
  os.homedir(),
  "Library",
  "Logs",
  "SaveVCards.log",
);
const MAX_BYTES = 1_000_000;

function debugEnabled(): boolean {
  try {
    return getPreferenceValues<Preferences>().debugLogging === true;
  } catch {
    return false;
  }
}

function write(line: string) {
  console.log(line);
  try {
    mkdirSync(path.dirname(LOG_FILE), { recursive: true });
    try {
      if (statSync(LOG_FILE).size > MAX_BYTES)
        renameSync(LOG_FILE, LOG_FILE + ".1");
    } catch {
      // no log yet
    }
    appendFileSync(LOG_FILE, line + "\n");
  } catch {
    // logging must never break a command
  }
}

function stringify(data: unknown): string {
  if (data instanceof Error) return `${data.name}: ${data.message}`;
  try {
    const s = typeof data === "string" ? data : JSON.stringify(data);
    return s.length > 2000 ? s.slice(0, 2000) + "…" : s;
  } catch {
    return String(data);
  }
}

/** Step, timing or error. `data` must not contain contact details. */
export function log(scope: string, message: string, data?: unknown) {
  write(
    `${new Date().toISOString()} [${scope}] ${message}${data === undefined ? "" : " " + stringify(data)}`,
  );
}

/** Contact details (names, emails, account names). Written only with Debug Logging on. */
export function logPrivate(scope: string, message: string, data: unknown) {
  if (debugEnabled()) log(scope, message, data);
}

/** Wraps an async call and logs how long it took. */
export async function timed<T>(
  scope: string,
  name: string,
  fn: () => Promise<T>,
): Promise<T> {
  const started = Date.now();
  try {
    const result = await fn();
    log(scope, `${name} ok in ${Date.now() - started} ms`);
    return result;
  } catch (err) {
    log(scope, `${name} failed after ${Date.now() - started} ms`, err);
    throw err;
  }
}
