import type { ForecastResponse } from "../api/forecast-schema";
import { resetHistory, type HistoryItem } from "./reset-history";

export type ResetCalendarDay = {
  key: string;
  day: number;
  records: HistoryItem[];
  isFuture: boolean;
};

export type ResetCalendarMonth = {
  key: string;
  label: string;
  isCurrent: boolean;
  firstWeekday: number;
  days: ResetCalendarDay[];
  resetDays: number;
};

function dateKey(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  return ["year", "month", "day"].map((type) => parts.find((part) => part.type === type)!.value).join("-");
}

/** Two local calendar months, oldest first. A reset day may have several source records. */
export function resetCalendar(
  response: ForecastResponse,
  now = new Date(),
  timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone,
): ResetCalendarMonth[] {
  const today = dateKey(now, timeZone);
  const [year, month] = today.split("-").map(Number);
  const recordsByDay = new Map<string, HistoryItem[]>();
  for (const record of resetHistory(response, "resets")) {
    if (Date.parse(record.dateTime) > now.getTime()) continue;
    const key = dateKey(new Date(record.dateTime), timeZone);
    recordsByDay.set(key, [...(recordsByDay.get(key) ?? []), record]);
  }

  return [-1, 0].map((offset) => {
    const first = new Date(Date.UTC(year, month - 1 + offset, 1));
    const key = first.toISOString().slice(0, 7);
    const dayCount = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
    const days = Array.from({ length: dayCount }, (_, index): ResetCalendarDay => {
      const day = index + 1;
      const dayKey = `${key}-${String(day).padStart(2, "0")}`;
      return {
        key: dayKey,
        day,
        records: recordsByDay.get(dayKey) ?? [],
        isFuture: dayKey > today,
      };
    });
    return {
      key,
      label: new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(first),
      isCurrent: offset === 0,
      firstWeekday: (first.getUTCDay() + 6) % 7,
      days,
      resetDays: days.filter((day) => day.records.length > 0).length,
    };
  });
}

export function calendarMonthSummary(month: ResetCalendarMonth): string {
  return `${month.resetDays} reset ${month.resetDays === 1 ? "day" : "days"}${month.isCurrent ? " · so far" : ""}`;
}

export function calendarMonthDescription(month: ResetCalendarMonth): string {
  const days = month.days.filter((day) => day.records.length).map((day) => day.day);
  return `${month.label}: ${calendarMonthSummary(month)}. ${days.length ? `Reset dates: ${days.join(", ")}.` : "No confirmed resets recorded."} Dates use your system time zone.`;
}

/** Both cards use the same six-week layout, typography, and date positions. */
export function calendarMonthImage(month: ResetCalendarMonth, appearance: "light" | "dark"): string {
  const dark = appearance === "dark";
  const foreground = dark ? "#f5f5f5" : "#171717";
  const secondary = dark ? "#b2b2b8" : "#52525b";
  const future = dark ? "#77777f" : "#8c8c95";
  const border = dark ? "#424247" : "#d4d4d8";
  const reset = dark ? "#72dfb5" : "#137451";
  const resetText = dark ? "#102a21" : "#ffffff";
  const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
    (day, index) =>
      `<text x="${42 + index * 46}" y="100" fill="${secondary}" font-size="14" text-anchor="middle">${day}</text>`,
  );
  const days = month.days.map((day) => {
    const cell = month.firstWeekday + day.day - 1;
    const x = 42 + (cell % 7) * 46;
    const y = 131 + Math.floor(cell / 7) * 34;
    const hasReset = day.records.length > 0;
    return `<g>
      ${hasReset ? `<circle cx="${x}" cy="${y}" r="14" fill="${reset}"/>` : ""}
      <text x="${x}" y="${y + 6}" text-anchor="middle" font-size="18" font-weight="${hasReset ? "700" : "400"}" fill="${hasReset ? resetText : day.isFuture ? future : foreground}">${day.day}</text>
    </g>`;
  });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="360" viewBox="0 0 360 360" font-family="Helvetica, Arial, sans-serif">
    <text x="22" y="36" font-size="25" font-weight="700" fill="${foreground}">${month.label}</text>
    <text x="22" y="62" font-size="16" fill="${secondary}">${calendarMonthSummary(month)}</text>
    <path d="M22 78H338" stroke="${border}"/>
    ${weekdays.join("")}${days.join("")}
    <circle cx="29" cy="335" r="7" fill="${reset}"/>
    <text x="44" y="340" font-size="14" fill="${secondary}">Reset day</text>
  </svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}
