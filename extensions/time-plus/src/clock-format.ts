const LOCALE = "en-US";

export type ClockPreferences = Preferences;

type DateOrder = ClockPreferences["dateOrder"];
type WeekdayPreference = ClockPreferences["weekday"] | "numeric";
type MonthPreference = ClockPreferences["month"];
type YearDigits = ClockPreferences["yearDigits"];

export function formatDate(
  now: Date,
  order: DateOrder,
  yearDigits: YearDigits,
  month: MonthPreference,
): string {
  const formatter = new Intl.DateTimeFormat(LOCALE, {
    year: yearDigits === "2" ? "2-digit" : "numeric",
    month: month === "none" ? undefined : month,
    day: "numeric",
  });
  const parts = formatter.formatToParts(now);
  const monthString = parts.find((p) => p.type === "month")?.value ?? "";
  const day = parts.find((p) => p.type === "day")?.value ?? "";
  const year = parts.find((p) => p.type === "year")?.value ?? "";

  if ("DMY" === order)
    return [day, monthString, year].filter(Boolean).join(" ");
  if ("YMD" === order)
    return [year, monthString, day].filter(Boolean).join(" ");
  return [monthString, day, year].filter(Boolean).join(" ");
}

export function formatWeekday(now: Date, weekday: WeekdayPreference) {
  if (weekday === "none") return "";
  // "numeric" isn't a valid Intl weekday format; map legacy value to "short".
  const weekdayFormat: "short" | "long" | "narrow" =
    weekday === "numeric" ? "short" : weekday;
  return new Intl.DateTimeFormat(LOCALE, {
    weekday: weekdayFormat,
  }).format(now);
}

export function formatTime(now: Date, preferences: ClockPreferences) {
  const time = new Intl.DateTimeFormat(LOCALE, {
    hour: "2-digit",
    minute: "2-digit",
    second: preferences.showSeconds ? "2-digit" : undefined,
    hour12: preferences.use24Hour === "12h",
  }).format(now);
  return preferences.showAmPm ? time : time.replace(/\s?[AP]M$/i, "");
}

export function formatSubtitle(now: Date, preferences: ClockPreferences) {
  const date = formatDate(
    now,
    preferences.dateOrder,
    preferences.yearDigits,
    preferences.month,
  );
  const weekday = formatWeekday(now, preferences.weekday);
  const time = formatTime(now, preferences);
  const dateWithWeekday = weekday ? `${weekday} ${date}` : date;
  return preferences.dateTimeOrder === "time-date"
    ? `${time} - ${dateWithWeekday}`
    : `${dateWithWeekday} - ${time}`;
}
