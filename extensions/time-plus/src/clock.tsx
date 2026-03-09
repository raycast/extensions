import {
  Detail,
  getPreferenceValues,
  updateCommandMetadata,
} from "@raycast/api";
import { useEffect, useMemo, useState } from "react";

type DateOrder = "MDY" | "DMY" | "YMD";
type WeekdayPreference = "numeric" | "short" | "long" | "none";
type MonthPreference = "numeric" | "short" | "long" | "none";
type DateTimeOrder = "date-time" | "time-date";
type TimeFormat = "12h" | "24h";

interface Preferences {
  weekday: WeekdayPreference;
  month: MonthPreference;
  yearDigits: "2" | "4";
  showSeconds: boolean;
  use24Hour: TimeFormat;
  showAmPm: boolean;
  dateOrder: DateOrder;
  dateTimeOrder: DateTimeOrder;
}

function formatDate(
  now: Date,
  order: DateOrder,
  yearDigits: "2" | "4",
  month: MonthPreference,
): string {
  const formatter = new Intl.DateTimeFormat(undefined, {
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

function formatWeekday(now: Date, weekday: WeekdayPreference) {
  if (weekday === "none") return "";
  // "numeric" isn't a valid Intl weekday format; map legacy value to "short".
  const weekdayFormat: "short" | "long" | "narrow" =
    weekday === "numeric" ? "short" : weekday;
  return new Intl.DateTimeFormat(undefined, {
    weekday: weekdayFormat,
  }).format(now);
}

function formatTime(now: Date, preferences: Preferences) {
  const time = new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: preferences.showSeconds ? "2-digit" : undefined,
    hour12: preferences.use24Hour === "12h",
  }).format(now);
  return preferences.showAmPm ? time : time.replace(/\s?[AP]M$/i, "");
}

function formatSubtitle(now: Date, preferences: Preferences) {
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

// This shows the formatted time and date in the detail view
function ClockDetail(props: { now: Date; preferences: Preferences }) {
  const subtitle = useMemo(
    () => formatSubtitle(props.now, props.preferences),
    [props.now, props.preferences],
  );
  return <Detail markdown={`# ${subtitle}`} />;
}

export default function Command() {
  const preferences = useMemo(() => getPreferenceValues<Preferences>(), []);
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const refreshed = new Date();
    setNow(refreshed);
  }, []);

  useEffect(() => {
    const subtitle = formatSubtitle(now, preferences);
    updateCommandMetadata({ subtitle });
  }, [now, preferences]);
  return <ClockDetail now={now} preferences={preferences} />;
}
