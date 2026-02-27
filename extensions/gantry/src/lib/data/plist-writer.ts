import { exec } from "../utils/exec";
import { homedir } from "os";
import type { ParsedSchedule } from "../types";
import { parsePlist } from "./plist-parser";

const ALLOWED_DIR = `${homedir()}/Library/LaunchAgents`;

function isUserAgent(path: string): boolean {
  return path.startsWith(ALLOWED_DIR + "/");
}

/**
 * Creates a backup of a plist file at {path}.gantry-backup
 */
export async function backupPlist(path: string): Promise<void> {
  if (!isUserAgent(path)) {
    throw new Error(`Cannot modify files outside ${ALLOWED_DIR}`);
  }
  await exec("cp", [path, `${path}.gantry-backup`]);
}

/**
 * Writes a new schedule to a plist file using plutil commands.
 * Only allows writes to files in ~/Library/LaunchAgents/.
 */
export async function writeScheduleToPlist(
  path: string,
  schedule: ParsedSchedule,
): Promise<void> {
  if (!isUserAgent(path)) {
    throw new Error(`Cannot modify files outside ${ALLOWED_DIR}`);
  }

  await exec("plutil", ["-remove", "StartCalendarInterval", path], {
    nothrow: true,
  });
  await exec("plutil", ["-remove", "StartInterval", path], { nothrow: true });

  if (schedule.type === "interval" && schedule.startInterval !== undefined) {
    await exec("plutil", [
      "-insert",
      "StartInterval",
      "-integer",
      String(schedule.startInterval),
      path,
    ]);
  } else if (schedule.type === "calendar" && schedule.calendarIntervals) {
    const intervals = schedule.calendarIntervals;

    if (intervals.length === 1) {
      const json = JSON.stringify(intervals[0]);
      await exec("plutil", [
        "-insert",
        "StartCalendarInterval",
        "-json",
        json,
        path,
      ]);
    } else {
      const json = JSON.stringify(intervals);
      await exec("plutil", [
        "-insert",
        "StartCalendarInterval",
        "-json",
        json,
        path,
      ]);
    }
  }

  await exec("plutil", ["-convert", "xml1", path]);

  const config = await parsePlist(path);
  if (schedule.type === "interval") {
    if (config.StartInterval !== schedule.startInterval) {
      throw new Error(
        "Verification failed: StartInterval mismatch after write",
      );
    }
  } else if (schedule.type === "calendar" && schedule.calendarIntervals) {
    if (config.StartCalendarInterval === undefined) {
      throw new Error(
        "Verification failed: StartCalendarInterval missing after write",
      );
    }
  }
}
