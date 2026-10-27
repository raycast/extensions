import { getPreferenceValues } from "@raycast/api";
import { AlertWindows } from "./state";
import { ARABIC_NAMES, MethodName, PRAYER_KEYS, PrayerKey, ScheduleConfig } from "./prayers";
import { PlanOptions } from "./plan";
import { readLocation, StoredLocation } from "./location";
import { formulaProblem, parseJamaatRule } from "./jamaat";
import { resolveRules, toSchool } from "./rules";

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

const JAMAAT_PREFS: [keyof Preferences, string, PrayerKey][] = [
  ["jamaatFajr", "Fajr Jamaat", "fajr"],
  ["jamaatDhuhr", "Dhuhr Jamaat", "dhuhr"],
  ["jamaatJumuah", "Jumu'ah Jamaat", "dhuhr"],
  ["jamaatAsr", "Asr Jamaat", "asr"],
  ["jamaatMaghrib", "Maghrib Jamaat", "maghrib"],
  ["jamaatIsha", "Isha Jamaat", "isha"],
];

/**
 * Jamaat rules that don't parse, and formulas that can't work. Such a prayer silently gets no jamaat, so say
 * so instead.
 *
 * @param prefs - Raw preferences.
 * @returns One message per unreadable rule.
 */
export function jamaatWarnings(prefs: Partial<Record<string, unknown>>): string[] {
  return JAMAAT_PREFS.flatMap(([name, label, key]) => {
    const text = String(prefs[name] ?? "");
    const rule = parseJamaatRule(text);
    if (rule.kind === "invalid") return [`${label} "${text.trim()}" isn't a valid rule`];
    const problem = rule.kind === "formula" && formulaProblem(rule.source, key);
    if (problem) return [`${label} "${text.trim()}": ${problem}`];
    const combines =
      (name === "jamaatAsr" && rule.kind === "after" && rule.prayer === "dhuhr") ||
      (name === "jamaatIsha" && rule.kind === "after" && rule.prayer === "maghrib");
    if (rule.kind === "after" && !combines) {
      return [`${label} "${text.trim()}": only Asr can follow Dhuhr, and only Isha can follow Maghrib`];
    }
    return [];
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
  const alerts = prefs.alerts ?? "reminders";

  const rules = resolveRules(toSchool(prefs.school), {
    asrStart: prefs.madhab,
    asrPreferred: prefs.asrPreferred,
    maghribStart: prefs.maghribStart,
    maghribEnd: prefs.maghribEnd,
    maghribPreferred: prefs.maghribPreferred,
    ishaEnd: prefs.ishaEnd,
    ishaPreferred: prefs.ishaPreferred,
    dhuhrEndsAtOneShadow: prefs.dhuhrEndsAtShafiAsr === true,
  });

  const dueAt = prefs.dueAt === "jamaat" ? "jamaat" : "start";
  const headsUpMinutes = Math.max(0, toNumber(prefs.headsUpMinutes, 15));
  const windows: AlertWindows = {
    startWindowMinutes: toNumber(prefs.startWindowMinutes, 5),
    preferredReminderMinutes: toNumber(prefs.preferredReminderMinutes, 15),
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
      madhab: rules.asrStart,
      adjustments: Object.fromEntries(PRAYER_KEYS.map((key, i) => [key, offsets[i] ?? 0])) as Record<PrayerKey, number>,
      ishaEnd: rules.ishaEnd,
      dhuhrEnd: rules.dhuhrEnd,
      maghribStart: rules.maghribStart,
      maghribEnd: rules.maghribEnd,
      dhuhrPreferred: rules.dhuhrPreferred,
      asrPreferred: rules.asrPreferred,
      maghribPreferred: rules.maghribPreferred,
      ishaPreferred: rules.ishaPreferred,
      lateAt: prefs.lateAt === "preferred" ? "preferred" : "valid",
      jamaat: {
        fajr: prefs.jamaatFajr ?? "",
        dhuhr: prefs.jamaatDhuhr ?? "",
        asr: prefs.jamaatAsr ?? "",
        maghrib: prefs.jamaatMaghrib ?? "",
        isha: prefs.jamaatIsha ?? "",
      },
      jamaatJumuah: prefs.jamaatJumuah ?? "",
      ...(prefs.prayerNames === "arabic" ? ARABIC_NAMES : {}),
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
