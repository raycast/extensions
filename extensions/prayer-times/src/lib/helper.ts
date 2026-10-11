import { environment } from "@raycast/api";
import { execFile } from "node:child_process";
import { chmod, copyFile, mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import {
  getPrayerStatuses as swiftGetPrayerStatuses,
  movePrayerReminders as swiftMovePrayerReminders,
  setPrayerCompleted as swiftSetPrayerCompleted,
  syncPrayerReminders as swiftSyncPrayerReminders,
} from "swift:../../swift/PrayerTimes";
import { PlannedReminder } from "./plan";

/** Matches the Swift SyncResult. */
export interface SyncResult {
  created: number;
  updated: number;
  unchanged: number;
  skippedCompleted: number;
  /** Missed prayers older than a week whose due date was removed. */
  undated: number;
  listCreated: boolean;
}

/** Matches the Swift PrayerStatus. */
export interface PrayerStatus {
  /** `YYYY-MM-DD/<slug>`. */
  key: string;
  isCompleted: boolean;
  completionDate?: string;
}

/** Matches the Swift LocateResult. Coordinates are rounded to 2 decimals (about 1 km). */
export interface LocateResult {
  latitude: number;
  longitude: number;
  accuracy: number;
  locality?: string;
  administrativeArea?: string;
  country?: string;
  countryCode?: string;
  timezone?: string;
}

const TIMEOUT_MS = 30_000;

/**
 * Reject when a Swift call takes too long (e.g. Reminders hanging on a slow iCloud sync).
 *
 * @param promise - The Swift call.
 * @returns The call's result.
 * @throws Error after {@link TIMEOUT_MS}.
 */
function withTimeout<T>(promise: Promise<T>): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Reminders helper timed out after ${TIMEOUT_MS / 1000}s`)), TIMEOUT_MS);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/**
 * Create missing prayer reminders and move changed ones.
 *
 * @param payload - List name, planned reminders and the missed-prayer cleanup window.
 * @returns Counts of what changed.
 */
export function syncPrayerReminders(payload: {
  listName: string;
  reminders: PlannedReminder[];
  /** Days before a missed prayer's due date is removed; 0 never removes it. */
  staleAfterDays: number;
}): Promise<SyncResult> {
  return withTimeout(swiftSyncPrayerReminders(payload) as Promise<SyncResult>);
}

/**
 * Move the extension's prayer reminders (with their history) to another list, after the Reminders List
 * setting changes. A prayer the new list already has stays in the old list with its alarms removed.
 *
 * @param fromList - Previous list.
 * @param toList - New list, created if missing.
 * @returns Number of reminders moved.
 */
export function movePrayerReminders(fromList: string, toList: string): Promise<number> {
  return withTimeout(swiftMovePrayerReminders(fromList, toList) as Promise<number>);
}

/**
 * Completion state of prayer reminders in a date range.
 *
 * @param listName - Reminders list.
 * @param fromDate - First date key, inclusive.
 * @param toDate - Last date key, inclusive.
 * @returns Statuses sorted by key.
 */
export function getPrayerStatuses(listName: string, fromDate: string, toDate: string): Promise<PrayerStatus[]> {
  return withTimeout(swiftGetPrayerStatuses(listName, fromDate, toDate) as Promise<PrayerStatus[]>);
}

/**
 * Tick or untick one prayer reminder.
 *
 * @param listName - Reminders list.
 * @param key - `YYYY-MM-DD/<slug>`.
 * @param completed - New state.
 * @param completionDate - Explicit completion time; defaults to now when completing.
 * @returns False when no reminder exists for the key.
 */
export function setPrayerCompleted(
  listName: string,
  key: string,
  completed: boolean,
  completionDate?: Date,
): Promise<boolean> {
  return withTimeout(swiftSetPrayerCompleted(listName, key, completed, completionDate?.toISOString() ?? null));
}

const LOCATION_APP = "Prayer Times Location.app";
const EXECUTABLE = "PrayerTimes";
const LOCATION_REASON = "Prayer Times uses your approximate location to calculate prayer times where you are.";
const INFO_PLIST = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleIdentifier</key>
  <string>com.rehansyed.prayer-times.location</string>
  <key>CFBundleName</key>
  <string>Prayer Times Location</string>
  <key>CFBundleDisplayName</key>
  <string>Prayer Times Location</string>
  <key>CFBundleExecutable</key>
  <string>${EXECUTABLE}</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>CFBundleShortVersionString</key>
  <string>1.0</string>
  <key>CFBundleVersion</key>
  <string>1</string>
  <key>LSMinimumSystemVersion</key>
  <string>13.0</string>
  <key>LSUIElement</key>
  <true/>
  <key>NSLocationUsageDescription</key>
  <string>${LOCATION_REASON}</string>
  <key>NSLocationWhenInUseUsageDescription</key>
  <string>${LOCATION_REASON}</string>
</dict>
</plist>
`;

/**
 * `Prayer Times Location.app` in the extension's support folder, (re)built from the Swift binary
 * Raycast compiled into the extension whenever that binary changes.
 *
 * macOS only shows the location prompt to an app bundle with a usage description; a binary run
 * directly by Raycast gets no prompt and no fix. So the bundle is assembled here from the same
 * compiled source, signed ad hoc with the system `codesign`, and opened with `open`.
 *
 * @returns Path to the app bundle.
 */
async function locationApp(): Promise<string> {
  const source = join(environment.assetsPath, "compiled_raycast_swift", EXECUTABLE);
  const app = join(environment.supportPath, LOCATION_APP);
  const target = join(app, "Contents", "MacOS", EXECUTABLE);
  // codesign rewrites the copied binary, so the copy can't be compared with the source directly.
  const stampFile = join(environment.supportPath, "location-app-source");
  const built = await stat(source);
  const stamp = `${built.size}:${built.mtimeMs}:${INFO_PLIST.length}`;
  const [previous, existing] = await Promise.all([
    readFile(stampFile, "utf8").catch(() => ""),
    stat(target).catch(() => undefined),
  ]);
  if (existing && previous === stamp) return app;

  await rm(app, { recursive: true, force: true });
  await mkdir(join(app, "Contents", "MacOS"), { recursive: true });
  await copyFile(source, target);
  await chmod(target, 0o755);
  await writeFile(join(app, "Contents", "Info.plist"), INFO_PLIST);
  await promisify(execFile)("/usr/bin/codesign", ["--force", "--sign", "-", app]);
  await writeFile(stampFile, stamp);
  return app;
}

/** Location waits up to 60 s in Swift for the first-time permission prompt. */
const LOCATE_TIMEOUT_MS = 75_000;

/**
 * One approximate location fix from macOS location services, with the place name when available.
 *
 * @returns Coordinates (rounded to about 1 km) and placemark.
 * @throws Error when access is denied or no fix arrives in time.
 */
export async function locateCurrent(): Promise<LocateResult> {
  const app = await locationApp();
  const dir = await mkdtemp(join(tmpdir(), "prayer-times-"));
  const out = join(dir, "out.json");
  const err = join(dir, "err.txt");
  try {
    await promisify(execFile)(
      "/usr/bin/open",
      ["-W", "-n", "-g", "--stdout", out, "--stderr", err, "-a", app, "--args", "locate"],
      { timeout: LOCATE_TIMEOUT_MS },
    );
    const raw = (await readFile(out, "utf8").catch(() => "")).trim();
    if (!raw) {
      const message = (await readFile(err, "utf8").catch(() => "")).trim();
      throw new Error(message || "Location helper returned no result");
    }
    return JSON.parse(raw) as LocateResult;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
