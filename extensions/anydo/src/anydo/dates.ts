import {
  formatJalaliDate,
  formatJalaliDateTime,
  toPersianDigits,
} from "./jalali";
import { dateStyle, defaultTimeOfDay, lang } from "./prefs";

function clock(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function isoDay(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** Due label that respects the "dateStyle" preference. */
export function formatDueUi(date: Date, hasTime: boolean): string {
  const style = dateStyle();
  if (style === "gregorian")
    return hasTime ? `${isoDay(date)} ${clock(date)}` : isoDay(date);
  if (style === "both") {
    return hasTime
      ? `${formatJalaliDate(date)} (${isoDay(date)}) ${toPersianDigits(clock(date))}`
      : `${formatJalaliDate(date)} (${isoDay(date)})`;
  }
  return formatJalaliDateTime(date, hasTime);
}

/** «۳ ساعت و ۲۰ دقیقه مانده» / «۲ روز گذشته» */
export function relativeLabel(date: Date, now: Date = new Date()): string {
  const english = lang() === "en";
  const diff = date.getTime() - now.getTime();
  const past = diff < 0;
  const minutes = Math.round(Math.abs(diff) / 60_000);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;

  const parts: string[] = [];
  if (days > 0)
    parts.push(
      english
        ? `${days} day${days > 1 ? "s" : ""}`
        : `${toPersianDigits(days)} روز`,
    );
  if (hours > 0 && days < 3)
    parts.push(english ? `${hours} h` : `${toPersianDigits(hours)} ساعت`);
  if (mins > 0 && days === 0)
    parts.push(english ? `${mins} min` : `${toPersianDigits(mins)} دقیقه`);
  if (parts.length === 0) return english ? "now" : "همین حالا";

  const body = parts.join(english ? " " : " و ");
  if (english) return past ? `${body} overdue` : `in ${body}`;
  return past ? `${body} گذشته` : `${body} مانده`;
}

/** Applies the "defaultTime" preference to a date that had no explicit clock. */
export function applyDefaultTime(date: Date): Date {
  const { hours, minutes } = defaultTimeOfDay();
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    hours,
    minutes,
    0,
    0,
  );
}

export { clock, isoDay };
