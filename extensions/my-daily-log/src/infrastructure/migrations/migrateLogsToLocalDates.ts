import { randomUUID } from "crypto";
import * as fs from "fs";
import * as path from "path";
import { addDays, parseDateKey, toDateKey } from "../../shared/dates";
import { parseStoredLogs } from "../dailyLog/storedLogs";

export const MIGRATION_MARKER_FILE = ".my-daily-log.json";
const CURRENT_STORAGE_VERSION = 2;

type LogRecord = { id: string; date: Date; title: string };

export type MigrationResult = { migrated: boolean; backupPath?: string };

/**
 * Up to version 1 the log files were named after the UTC date (`toISOString()`) instead of the local one,
 * so logs written in the evening (or right after midnight) ended up in the file of another day, and
 * very old versions stored logs as plain text `.md` files.
 *
 * This migration, which runs only once per logs folder:
 * 1. Backs up every log file to a hidden `.backup-…` folder.
 * 2. Reads every log (from `.json` and legacy `.md` files).
 * 3. Writes them back to a `YYYY-MM-DD.json` file named after their local date.
 */
export function migrateLogsToLocalDates(logsPath: string): MigrationResult {
  if (!fs.existsSync(logsPath) || readStorageVersion(logsPath) >= CURRENT_STORAGE_VERSION) {
    return { migrated: false };
  }

  const files = fs.readdirSync(logsPath);
  const jsonFiles = files.filter((file) => file.endsWith(".json") && parseDateKey(file.slice(0, -5)));
  const legacyFiles = files.filter((file) => file.endsWith(".md") && parseDateKey(file.slice(0, -3)));

  if (jsonFiles.length === 0 && legacyFiles.length === 0) {
    writeStorageVersion(logsPath);
    return { migrated: false };
  }

  // Read everything first, so a broken file aborts the migration before anything is modified.
  const logsById = new Map<string, LogRecord>();
  for (const file of jsonFiles) {
    const content = fs.readFileSync(path.join(logsPath, file), "utf8");
    let logs;
    try {
      logs = parseStoredLogs(content);
    } catch (error) {
      throw new Error(
        `Could not upgrade your logs because ${path.join(logsPath, file)} is invalid (${
          error instanceof Error ? error.message : error
        }). Fix or remove that file and try again.`,
      );
    }
    logs.forEach((log) => logsById.set(log.id, { id: log.id, date: log.date, title: log.title }));
  }
  for (const file of legacyFiles) {
    const fileDateKey = file.slice(0, -3);
    const content = fs.readFileSync(path.join(logsPath, file), "utf8");
    parseLegacyLogs(content, fileDateKey).forEach((log) => logsById.set(log.id, log));
  }

  const backupPath = path.join(logsPath, `.backup-${new Date().toISOString().replace(/[:.]/g, "-")}`);
  fs.mkdirSync(backupPath, { recursive: true });
  [...jsonFiles, ...legacyFiles].forEach((file) =>
    fs.copyFileSync(path.join(logsPath, file), path.join(backupPath, file)),
  );

  const logsByDay = new Map<string, LogRecord[]>();
  logsById.forEach((log) => {
    const key = toDateKey(log.date);
    logsByDay.set(key, [...(logsByDay.get(key) ?? []), log]);
  });

  logsByDay.forEach((logs, key) => {
    const sorted = logs.sort((a, b) => a.date.getTime() - b.date.getTime());
    fs.writeFileSync(path.join(logsPath, `${key}.json`), JSON.stringify(sorted, null, 2));
  });
  jsonFiles
    .filter((file) => !logsByDay.has(file.slice(0, -5)))
    .forEach((file) => fs.rmSync(path.join(logsPath, file), { force: true }));
  legacyFiles.forEach((file) => fs.rmSync(path.join(logsPath, file), { force: true }));

  writeStorageVersion(logsPath);
  return { migrated: true, backupPath };
}

/**
 * Legacy `.md` files contain one log per line, formatted as `<date> H:M:S: <title>`.
 * The file was named after the UTC date while the time is local, so we pick the local day
 * (the file's day, the one before or the one after) that matches the UTC date of the file name.
 */
export function parseLegacyLogs(content: string, fileDateKey: string): LogRecord[] {
  const fileDate = parseDateKey(fileDateKey);
  if (!fileDate) {
    return [];
  }
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const match = line.match(/^\S+\s+(\d{1,2}):(\d{1,2}):(\d{1,2}):\s?(.*)$/);
      if (!match) {
        const date = new Date(fileDate);
        date.setHours(12);
        return { id: randomUUID(), date, title: line };
      }
      const [, hours, minutes, seconds, title] = match;
      const candidates = [0, -1, 1].map((offset) => {
        const date = addDays(fileDate, offset);
        date.setHours(Number(hours), Number(minutes), Number(seconds));
        return date;
      });
      const date =
        candidates.find((candidate) => candidate.toISOString().slice(0, 10) === fileDateKey) ?? candidates[0];
      return { id: randomUUID(), date, title };
    });
}

function readStorageVersion(logsPath: string): number {
  try {
    const marker = JSON.parse(fs.readFileSync(path.join(logsPath, MIGRATION_MARKER_FILE), "utf8"));
    return typeof marker?.storageVersion === "number" ? marker.storageVersion : 0;
  } catch {
    return 0;
  }
}

function writeStorageVersion(logsPath: string) {
  fs.writeFileSync(
    path.join(logsPath, MIGRATION_MARKER_FILE),
    JSON.stringify({ storageVersion: CURRENT_STORAGE_VERSION }, null, 2),
  );
}
