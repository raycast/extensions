import { getPreferenceValues } from "@raycast/api";
import { AlertWindows } from "./state";
import { MethodName, PRAYER_KEYS, PrayerKey, ScheduleConfig } from "./prayers";
import { PlanOptions } from "./plan";
import { readLocation, StoredLocation } from "./location";
import { parseJamaatRule } from "./jamaat";

/** Parsed, typed view of the extension preferences. */
export interface Settings {
  location: StoredLocation;
  schedule: ScheduleConfig;
  windows: AlertWindows;
  plan: PlanOptions;
  reminders: {
    /** Keep prayer reminders in Apple Reminders; off keeps prayed status in Raycast only. */
    enabled: boolean;
    /** Put notification alarms on the reminders. */
    alarms: boolean;
    listName: string;
    /** Days a missed prayer stays dated before its date is removed; 0 keeps it dated. */
    cleanMissedAfterDays: number;
  };
  /** Notifications the extension schedules itself, while Raycast runs. */
  notify: {
    banner: boolean;
    popup: boolean;
  };
  menuBarAlways: boolean;
  /** Preference problems to show the user, e.g. a jamaat rule that can't be read. */
  warnings: string[];
}

const JAMAAT_PREFS: [keyof Preferences, string][] = [
  ["jamaatFajr", "Fajr Jamaat"],
  ["jamaatDhuhr", "Dhuhr Jamaat"],
  ["jamaatJumuah", "Jumu'ah Jamaat"],
  ["jamaatAsr", "Asr Jamaat"],
  ["jamaatMaghrib", "Maghrib Jamaat"],
  ["jamaatIsha", "Isha Jamaat"],
];

/**
 * Jamaat rules that don't parse. Such a prayer silently gets no jamaat, so say so instead.
 *
 * @param prefs - Raw preferences.
 * @returns One message per unreadable rule.
 */
export function jamaatWarnings(prefs: Partial<Record<string, unknown>>): string[] {
  return JAMAAT_PREFS.flatMap(([name, label]) => {
    const text = String(prefs[name] ?? "");
    return parseJamaatRule(text).kind === "invalid" ? [`${label} "${text.trim()}" isn't a valid rule`] : [];
  });
}

function toNumber(text: string | undefined, fallback: number): number {
  const trimmed = (text ?? "").trim();
  const value = Number(trimmed);
  return trimmed !== "" && Number.isFinite(value) ? value : fallback;
}

/** Thrown when no location has been set yet; commands send the user to Set Prayer Location. */
export class LocationMissingError extends Error {
  constructor() {
    super("Set your location first");
    this.name = "LocationMissingError";
  }
}

/**
 * Load the saved location and preferences.
 *
 * @returns Typed settings.
 * @throws LocationMissingError when no location is saved.
 */
export async function loadSettings(): Promise<Settings> {
  const location = await readLocation();
  if (!location) throw new LocationMissingError();
  return buildSettings(location);
}

/**
 * Combine a location with the extension preferences.
 *
 * @param location - Saved location.
 * @returns Typed settings.
 */
export function buildSettings(location: StoredLocation): Settings {
  const prefs = getPreferenceValues<Preferences>();
  const { latitude, longitude } = location;

  const offsets = (prefs.adjustments ?? "").split(",").map((part) => toNumber(part, 0));
  const titles = (prefs.reminderTitles ?? "").split(",").map((part) => part.trim());
  const alerts = prefs.alerts ?? "reminders";

  const dueAt = prefs.dueAt === "jamaat" ? "jamaat" : "start";
  const headsUpMinutes = Math.max(0, toNumber(prefs.headsUpMinutes, 15));
  const windows: AlertWindows = {
    startWindowMinutes: toNumber(prefs.startWindowMinutes, 5),
    endingReminderMinutes: toNumber(prefs.endingReminderMinutes, 30),
    jamaatReminderMinutes: toNumber(prefs.jamaatReminderMinutes, 10),
    headsUpMinutes,
    dueAt,
  };

  return {
    location,
    schedule: {
      latitude,
      longitude,
      method: (prefs.method || "Karachi") as MethodName,
      madhab: prefs.madhab === "shafi" ? "shafi" : "hanafi",
      adjustments: Object.fromEntries(PRAYER_KEYS.map((key, i) => [key, offsets[i] ?? 0])) as Record<PrayerKey, number>,
      ishaEnd: prefs.ishaEnd === "fajr" ? "fajr" : "midnight",
      dhuhrEnd: prefs.dhuhrEndsAtShafiAsr === false ? "asr" : "shafiAsr",
      jamaat: {
        fajr: prefs.jamaatFajr ?? "",
        dhuhr: prefs.jamaatDhuhr ?? "",
        asr: prefs.jamaatAsr ?? "",
        maghrib: prefs.jamaatMaghrib ?? "",
        isha: prefs.jamaatIsha ?? "",
      },
      jamaatJumuah: prefs.jamaatJumuah ?? "",
      names: Object.fromEntries(PRAYER_KEYS.map((key, i) => [key, titles[i] ?? ""])) as Record<PrayerKey, string>,
      jumuahName: (prefs.jumuahTitle ?? "").trim() || "Jumu'ah",
    },
    windows,
    plan: {
      dueAt,
      headsUpMinutes,
      windows,
      days: Math.min(31, Math.max(1, Math.round(toNumber(prefs.daysAhead, 14)))),
    },
    reminders: {
      enabled: prefs.useReminders !== false,
      alarms: alerts === "reminders" || alerts === "both",
      listName: (prefs.remindersList ?? "").trim() || "Prayer",
      cleanMissedAfterDays: Math.max(0, Math.round(toNumber(prefs.cleanMissedAfterDays, 7))),
    },
    notify: {
      banner: alerts === "banner",
      popup: alerts === "popup" || alerts === "both",
    },
    menuBarAlways: Boolean(prefs.menuBarShowNext),
    warnings: jamaatWarnings(prefs),
  };
}
