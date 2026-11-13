import { Interval, Options } from "../src/lib/types";

export const VTIMEZONE = [
  "BEGIN:VTIMEZONE",
  "TZID:W. Europe Standard Time",
  "BEGIN:STANDARD",
  "DTSTART:16010101T030000",
  "TZOFFSETFROM:+0200",
  "TZOFFSETTO:+0100",
  "RRULE:FREQ=YEARLY;INTERVAL=1;BYDAY=-1SU;BYMONTH=10",
  "END:STANDARD",
  "BEGIN:DAYLIGHT",
  "DTSTART:16010101T020000",
  "TZOFFSETFROM:+0100",
  "TZOFFSETTO:+0200",
  "RRULE:FREQ=YEARLY;INTERVAL=1;BYDAY=-1SU;BYMONTH=3",
  "END:DAYLIGHT",
  "END:VTIMEZONE",
].join("\r\n");

export const TZID = "TZID=W. Europe Standard Time";

export function calendar(...parts: string[]): string {
  return ["BEGIN:VCALENDAR", "VERSION:2.0", ...parts, "END:VCALENDAR"].join("\r\n");
}

export function vevent(...lines: string[]): string {
  return ["BEGIN:VEVENT", ...lines, "END:VEVENT"].join("\r\n");
}

export function local(year: number, month: number, day: number, hour = 0, minute = 0): Date {
  return new Date(year, month - 1, day, hour, minute);
}

export function hm(ms: number): string {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function span(iv: Interval): string {
  return `${hm(iv.start)}-${hm(iv.end)}`;
}

export function spans(list: Interval[]): string[] {
  return list.map(span);
}

export function stamp(ms: number): string {
  const d = new Date(ms);
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return `${date} ${hm(ms)}`;
}

export function options(overrides: Partial<Options> = {}): Options {
  return {
    weeks: 1,
    startHour: 8,
    endHour: 18,
    minSlotMinutes: 30,
    tentativeIsBusy: true,
    includeWeekend: false,
    language: "en",
    ...overrides,
  };
}
