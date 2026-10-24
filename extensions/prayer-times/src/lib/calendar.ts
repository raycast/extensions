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

const CELL = { width: 46, height: 30, gap: 4, header: 18 };

/** Cell fills per tone, then text and stroke colors, for each Raycast appearance. */
const PALETTE = {
  light: {
    fill: { full: "#34C759", partial: "#FF9500", none: "#FF3B30", noData: "#E5E5EA", future: "none" },
    text: "#1C1C1E",
    muted: "#8E8E93",
  },
  dark: {
    fill: { full: "#30D158", partial: "#FF9F0A", none: "#FF453A", noData: "#3A3A3C", future: "none" },
    text: "#F2F2F7",
    muted: "#8E8E93",
  },
} as const;

/**
 * A month as an SVG calendar, Monday first, each day's cell filled by its tone and today outlined.
 * Markdown can't color table cells, so the calendar panel shows this image.
 *
 * @param year - Full year.
 * @param month - Month, 0–11.
 * @param toneOf - Tone for a date key.
 * @param today - Today's date key.
 * @param appearance - Raycast's light or dark appearance.
 * @returns SVG markup.
 */
export function monthSvg(
  year: number,
  month: number,
  toneOf: (date: string) => DayTone,
  today: string,
  appearance: "light" | "dark",
): string {
  const colors = PALETTE[appearance];
  const { blanks, dates } = monthDays(year, month);
  const step = (n: number, size: number) => n * (size + CELL.gap);
  const rows = Math.ceil((blanks + dates.length) / 7);
  const width = step(7, CELL.width) - CELL.gap;
  const height = CELL.header + CELL.gap + step(rows, CELL.height) - CELL.gap;
  const font = `font-family="-apple-system, system-ui, sans-serif" text-anchor="middle"`;
  const header = ["M", "T", "W", "T", "F", "S", "S"].map(
    (letter, i) =>
      `<text x="${step(i, CELL.width) + CELL.width / 2}" y="13" font-size="11" fill="${colors.muted}" ${font}>${letter}</text>`,
  );
  const cells = dates.map((date, i) => {
    const key = toDateKey(date);
    const tone = toneOf(key);
    const x = step((blanks + i) % 7, CELL.width);
    const y = CELL.header + CELL.gap + step(Math.floor((blanks + i) / 7), CELL.height);
    const filled = tone !== "noData" && tone !== "future";
    const stroke =
      key === today
        ? `stroke="${colors.text}" stroke-width="2"`
        : tone === "future"
          ? `stroke="${colors.muted}" stroke-opacity="0.4"`
          : "";
    const text = filled ? "#1C1C1E" : tone === "future" ? colors.muted : colors.text;
    return (
      `<rect x="${x}" y="${y}" width="${CELL.width}" height="${CELL.height}" rx="6" fill="${colors.fill[tone]}" ${stroke}/>` +
      `<text x="${x + CELL.width / 2}" y="${y + 19}" font-size="13" font-weight="600" fill="${text}" ${font}>${date.getDate()}</text>`
    );
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${[...header, ...cells].join("")}</svg>`;
}
