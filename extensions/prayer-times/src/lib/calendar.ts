import { PRAYER_KEYS, toDateKey } from "./prayers";
import { StatRecord } from "./stats";

/** How a calendar day is colored: all five prayed, some, none, no reminder data, or still ahead. */
export type DayTone = "full" | "partial" | "none" | "noData" | "future";

/**
 * A month laid out for a seven-column calendar that starts on Monday.
 *
 * @param year - Full year.
 * @param month - Month, 0–11.
 * @returns Empty cells before the 1st, and every day of the month at local noon.
 */
export function monthDays(year: number, month: number): { blanks: number; dates: Date[] } {
  const count = new Date(year, month + 1, 0).getDate();
  const dates = Array.from({ length: count }, (_, i) => new Date(year, month, i + 1, 12));
  return { blanks: (dates[0].getDay() + 6) % 7, dates };
}

/**
 * Prayers marked prayed on a day.
 *
 * @param day - The day's records.
 * @returns Count, 0–5.
 */
export function prayedCount(day: Partial<Record<string, StatRecord>> | undefined): number {
  return PRAYER_KEYS.filter((key) => day?.[key]?.completed).length;
}

/**
 * The tone of a calendar day.
 *
 * @param day - The day's records; missing or empty means no reminder data.
 * @param date - Its date key.
 * @param today - Today's date key.
 * @returns Tone.
 */
export function dayTone(day: Partial<Record<string, StatRecord>> | undefined, date: string, today: string): DayTone {
  if (date > today) return "future";
  if (!day || Object.keys(day).length === 0) return "noData";
  const count = prayedCount(day);
  return count === PRAYER_KEYS.length ? "full" : count > 0 ? "partial" : "none";
}

/** Dot per day in the month table. */
export const TONE_DOTS: Record<DayTone, string> = { full: "🟢", partial: "🟠", none: "🔴", noData: "⚪", future: "" };

/**
 * A month as a Markdown table, Monday first, each day with its dot; the selected day is bold.
 *
 * @param year - Full year.
 * @param month - Month, 0–11.
 * @param toneOf - Tone for a date key.
 * @param selected - Date key to highlight.
 * @returns Markdown table.
 */
export function monthTable(year: number, month: number, toneOf: (date: string) => DayTone, selected: string): string {
  const { blanks, dates } = monthDays(year, month);
  const cells: string[] = Array<string>(blanks).fill(" ");
  for (const date of dates) {
    const key = toDateKey(date);
    const label = `${TONE_DOTS[toneOf(key)]} ${date.getDate()}`.trim();
    cells.push(key === selected ? `**${label}**` : label);
  }
  while (cells.length % 7) cells.push(" ");
  const rows = Array.from({ length: cells.length / 7 }, (_, i) => `| ${cells.slice(i * 7, i * 7 + 7).join(" | ")} |`);
  return ["| Mon | Tue | Wed | Thu | Fri | Sat | Sun |", "|:-:|:-:|:-:|:-:|:-:|:-:|:-:|", ...rows].join("\n");
}
