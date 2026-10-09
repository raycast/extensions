import { readFile } from "fs/promises";
import { homedir } from "os";
import { join } from "path";

export interface FocusMode {
  id: string;
  name: string;
  symbol?: string;
  tint?: string;
}

export interface FocusState {
  modes: FocusMode[];
  activeId?: string;
}

const DATABASE = join(homedir(), "Library/DoNotDisturb/DB");
const DO_NOT_DISTURB_ID = "com.apple.donotdisturb.mode.default";
// The Focus database counts seconds from 2001-01-01, which is this many seconds after the Unix epoch.
const DATABASE_EPOCH = 978307200;
const TRIGGER_ENABLED = 2;

/** macOS only lets apps with Full Disk Access read the Focus database. */
export class FullDiskAccessError extends Error {
  constructor() {
    super("Raycast needs Full Disk Access to read your Focus modes");
  }
}

export interface ScheduleTrigger {
  class?: string;
  enabledSetting?: number;
  timePeriodStartTimeHour?: number;
  timePeriodStartTimeMinute?: number;
  timePeriodEndTimeHour?: number;
  timePeriodEndTimeMinute?: number;
  timePeriodWeekdays?: number;
}

export interface ModeConfigurations {
  data?: {
    modeConfigurations?: Record<
      string,
      {
        mode?: { name?: string; modeIdentifier?: string; symbolImageName?: string; tintColorName?: string };
        triggers?: { triggers?: ScheduleTrigger[] };
      }
    >;
  }[];
}

export interface Assertions {
  data?: {
    storeAssertionRecords?: {
      assertionStartDateTimestamp?: number;
      assertionDetails?: { assertionDetailsModeIdentifier?: string };
    }[];
    storeInvalidationRequestRecords?: {
      invalidationRequestDateTimestamp?: number;
      invalidationRequestPredicate?: { invalidationPredicateType?: string };
    }[];
  }[];
}

async function readDatabase<T>(file: string): Promise<T | undefined> {
  try {
    return JSON.parse(await readFile(join(DATABASE, file), "utf8"));
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "EPERM" || code === "EACCES") throw new FullDiskAccessError();
    if (code === "ENOENT") return undefined;
    throw error;
  }
}

// Schedule triggers store their days as bits from Monday (1) to Sunday (64).
const weekdayBit = (day: number) => (day === 0 ? 64 : 1 << (day - 1));

/** When the window of `trigger` that contains `now` started, or undefined if `now` is outside its windows. */
export function scheduleWindowStart(trigger: ScheduleTrigger, now: Date): Date | undefined {
  const startHour = trigger.timePeriodStartTimeHour ?? 0;
  const startMinute = trigger.timePeriodStartTimeMinute ?? 0;
  const start = startHour * 60 + startMinute;
  const end = (trigger.timePeriodEndTimeHour ?? 0) * 60 + (trigger.timePeriodEndTimeMinute ?? 0);
  const days = trigger.timePeriodWeekdays ?? 0;
  const minute = now.getHours() * 60 + now.getMinutes();
  const today = now.getDay();
  const startedDaysAgo = (daysAgo: number) => {
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);
    date.setHours(startHour, startMinute, 0, 0);
    return date;
  };

  if (start < end) {
    return days & weekdayBit(today) && minute >= start && minute < end ? startedDaysAgo(0) : undefined;
  }
  // A window that crosses midnight belongs to the day it starts on.
  if (minute >= start && days & weekdayBit(today)) return startedDaysAgo(0);
  if (minute < end && days & weekdayBit((today + 6) % 7)) return startedDaysAgo(1);
  return undefined;
}

/**
 * Turning a Focus on manually, by automation, or by sleep schedule adds an assertion record, but
 * a time schedule doesn't. So the Focus that's on is whichever started last: an assertion, or an
 * enabled schedule whose window is open, unless Focus was turned off after that window started.
 */
export function resolveFocusState(
  configurations: ModeConfigurations | undefined,
  assertions: Assertions | undefined,
  now = new Date(),
): FocusState {
  const configs = Object.entries(configurations?.data?.[0]?.modeConfigurations ?? {});
  const modes = configs
    .map(([id, { mode }]) => ({
      id: mode?.modeIdentifier ?? id,
      name: mode?.name ?? id,
      symbol: mode?.symbolImageName,
      tint: mode?.tintColorName,
    }))
    // Do Not Disturb first, like in Control Center, then alphabetically.
    .sort(
      (a, b) => Number(b.id === DO_NOT_DISTURB_ID) - Number(a.id === DO_NOT_DISTURB_ID) || a.name.localeCompare(b.name),
    );

  const store = assertions?.data?.[0];
  // Turning Focus off (in Control Center or with this extension) records an "any" invalidation.
  const turnedOffAt = Math.max(
    -Infinity,
    ...(store?.storeInvalidationRequestRecords ?? [])
      .filter((request) => request.invalidationRequestPredicate?.invalidationPredicateType === "any")
      .map((request) => request.invalidationRequestDateTimestamp ?? -Infinity),
  );

  const candidates: { id?: string; start: number }[] = (store?.storeAssertionRecords ?? []).map((record) => ({
    id: record.assertionDetails?.assertionDetailsModeIdentifier,
    start: record.assertionStartDateTimestamp ?? 0,
  }));
  for (const [id, { mode, triggers }] of configs) {
    for (const trigger of triggers?.triggers ?? []) {
      if (trigger.class !== "DNDModeConfigurationScheduleTrigger" || trigger.enabledSetting !== TRIGGER_ENABLED) {
        continue;
      }
      const windowStart = scheduleWindowStart(trigger, now);
      const start = windowStart && windowStart.getTime() / 1000 - DATABASE_EPOCH;
      if (start && start > turnedOffAt) candidates.push({ id: mode?.modeIdentifier ?? id, start });
    }
  }

  const [latest] = candidates.sort((a, b) => b.start - a.start);
  return { modes, activeId: latest?.id };
}

export async function getFocusState(): Promise<FocusState> {
  const [configurations, assertions] = await Promise.all([
    readDatabase<ModeConfigurations>("ModeConfigurations.json"),
    readDatabase<Assertions>("Assertions.json"),
  ]);
  return resolveFocusState(configurations, assertions);
}

/**
 * Waits until the Focus database shows `activeId` as the active Focus (undefined meaning off).
 * Resolves with false if it hasn't after `timeout` ms.
 */
export async function waitForActiveFocus(activeId: string | undefined, timeout = 90_000): Promise<boolean> {
  const deadline = Date.now() + timeout;
  for (;;) {
    if ((await getFocusState()).activeId === activeId) return true;
    if (Date.now() >= deadline) return false;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}
