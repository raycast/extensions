import { getPreferenceValues } from "@raycast/api";

export type Prefs = {
  language?: string;
  dateStyle?: string;
  countdown?: boolean;
  defaultList?: string;
  defaultTime?: string;
  reminderOffset?: string;
  pomodoroMinutes?: string;
  defaultView?: string;
  alertEnabled?: boolean;
  alertLeadMinutes?: string;
  alertSoundKind?: string;
  alertSoundFile?: string;
  telegramEnabled?: boolean;
  telegramToken?: string;
  telegramChatId?: string;
  telegramTime?: string;
  weeklyTelegram?: boolean;
  weeklyDay?: string;
  weeklyTime?: string;
  twoPane?: boolean;
  dailyLogEnabled?: boolean;
  dailyLogTime?: string;
  logEnabled?: boolean;
  logDirectory?: string;
  notionEnabled?: boolean;
  notionToken?: string;
  notionDatabaseId?: string;
  laterLabel?: string;
  reportFont?: string;
  reportFontFile?: string;
  telegramDueAlerts?: boolean;
  subtasksInPane?: boolean;
  monthlyArchive?: boolean;
  monthlyArchiveDay?: string;
};

export type Lang = "fa" | "en";
export type ViewMode = "open" | "today" | "week" | "nodate" | "completed";

/** Raycast extension preferences (see `preferences` in package.json). */
export function prefs(): Prefs {
  return getPreferenceValues<Prefs>();
}

export function lang(): Lang {
  return prefs().language === "en" ? "en" : "fa";
}

export function dateStyle(): "jalali" | "gregorian" | "both" {
  const value = prefs().dateStyle;
  return value === "gregorian" || value === "both" ? value : "jalali";
}

export function countdownEnabled(): boolean {
  return prefs().countdown !== false;
}

export function defaultView(): ViewMode {
  const value = prefs().defaultView;
  return value === "today" ||
    value === "week" ||
    value === "nodate" ||
    value === "completed"
    ? value
    : "open";
}

/** Time of day used when a task text has no clock time. */
export function defaultTimeOfDay(): { hours: number; minutes: number } {
  const raw = (prefs().defaultTime ?? "09:00").trim();
  const match = raw.match(/^(\d{1,2})\s*[:.]\s*(\d{1,2})$/);
  if (!match) return { hours: 9, minutes: 0 };
  return {
    hours: Math.min(23, Number(match[1])),
    minutes: Math.min(59, Number(match[2])),
  };
}

export function alertLeadMinutes(): number {
  const value = Number((prefs().alertLeadMinutes ?? "15").trim());
  return Number.isFinite(value) && value >= 0
    ? Math.min(1440, Math.round(value))
    : 15;
}

export function alertEnabled(): boolean {
  return prefs().alertEnabled !== false;
}

export type SoundKind =
  "default" | "reminder" | "im" | "mail" | "alarm" | "silent";

export function alertSoundKind(): SoundKind {
  const value = prefs().alertSoundKind;
  if (
    value === "default" ||
    value === "im" ||
    value === "mail" ||
    value === "alarm" ||
    value === "silent"
  )
    return value;
  return "reminder";
}

/** Optional .wav file played on top of the toast. */
export function alertSoundFile(): string | null {
  const value = (prefs().alertSoundFile ?? "").trim();
  return value.length > 0 ? value : null;
}

export function pomodoroMinutes(): number {
  const value = Number(prefs().pomodoroMinutes ?? "25");
  return [15, 25, 45, 50].includes(value) ? value : 25;
}

/** Minutes before the due time for a default reminder, or null when disabled. */
export function reminderOffsetMinutes(): number | null {
  const value = String(prefs().reminderOffset ?? "none");
  if (value === "none") return null;
  if (value === "at") return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function defaultListName(): string {
  return (prefs().defaultList ?? "").trim();
}

export function telegramTime(): string {
  return (prefs().telegramTime ?? "08:00").trim();
}

export function weeklyTelegramEnabled(): boolean {
  return prefs().weeklyTelegram === true;
}

/** 0 = Saturday … 6 = Friday (Persian week). */
export function weeklyDay(): number {
  const value = Number(prefs().weeklyDay ?? "0");
  return Number.isFinite(value) && value >= 0 && value <= 6 ? value : 0;
}

export function weeklyTime(): string {
  return (prefs().weeklyTime ?? "20:00").trim();
}

export function twoPane(): boolean {
  return prefs().twoPane !== false;
}

export function dailyLogEnabled(): boolean {
  return prefs().dailyLogEnabled === true;
}

export function dailyLogTime(): string {
  return (prefs().dailyLogTime ?? "22:00").trim();
}

export function logEnabled(): boolean {
  return prefs().logEnabled === true;
}

export function logDirectory(): string | null {
  const value = (prefs().logDirectory ?? "").trim();
  return value.length > 0 ? value : null;
}

export function notionEnabled(): boolean {
  return prefs().notionEnabled === true;
}

export function notionCredentials(): {
  token: string;
  databaseId: string;
} | null {
  const token = (prefs().notionToken ?? "").trim();
  const databaseId = (prefs().notionDatabaseId ?? "").trim();
  return token && databaseId ? { token, databaseId } : null;
}

/** Name of the "later / beyond this week" section — the user picks the wording. */
export function laterLabel(): string {
  return (prefs().laterLabel ?? "آینده").trim() || "آینده";
}

/** Font family used in the generated HTML reports (falls back to the system font). */
export function reportFont(): string {
  const value = (prefs().reportFont ?? "Vazirmatn").trim();
  return value.length > 0 ? value : "Vazirmatn";
}

/** Path of a font file to embed in the reports (so IRANSansX or a custom font really applies). */
export function reportFontFile(): string | null {
  const value = (prefs().reportFontFile ?? "").trim();
  return value.length > 0 ? value : null;
}

export function telegramDueAlertsEnabled(): boolean {
  return prefs().telegramDueAlerts !== false;
}

export function subtasksInPane(): boolean {
  return prefs().subtasksInPane !== false;
}

export function monthlyArchiveEnabled(): boolean {
  return prefs().monthlyArchive === true;
}

/** Day of month (1-28) on which the automatic archive is written. */
export function monthlyArchiveDay(): number {
  const value = Number((prefs().monthlyArchiveDay ?? "1").trim());
  return Number.isFinite(value) && value >= 1 && value <= 28
    ? Math.round(value)
    : 1;
}

export { getPreferenceValues };
