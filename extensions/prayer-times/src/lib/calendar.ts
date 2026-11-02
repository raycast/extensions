import { PRAYER_KEYS, toDateKey } from "./prayers";
import { Hex, STATUS_HEX, TONE_HEX } from "./colors";
import { PrayerStatusValue, STATUS_LABELS } from "./status";
import { StatRecord } from "./stats";

/**
 * A calendar day's color, Today's status colors: the status most of its prayers have (with jamaat counts as on
 * time; a tie goes to the worse one), grey with no reminder data or before anything is prayed or missed.
 */
export type DayTone = "ontime" | "late" | "madeup" | "missed" | "noData" | "future";

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

/** Statuses from worst to best, for breaking a tie. */
const WORST_FIRST = ["missed", "madeup", "late", "ontime"] as const;

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
  const counts = new Map<string, number>();
  for (const key of PRAYER_KEYS) {
    const status = day[key]?.status === "jamaat" ? "ontime" : day[key]?.status;
    if (status) counts.set(status, (counts.get(status) ?? 0) + 1);
  }
  const most = Math.max(0, ...counts.values());
  return WORST_FIRST.find((status) => most > 0 && counts.get(status) === most) ?? "future";
}

/** Cell fills are softened (see-through) so a month of color isn't glaring. */
const FILL_OPACITY = 0.45;

const CELL = { width: 56, height: 24, gap: 3 };
const WIDTH = 7 * CELL.width + 6 * CELL.gap;

const lightOf = <K extends string>(hex: Record<K, Hex>) =>
  Object.fromEntries(Object.entries<Hex>(hex).map(([k, v]) => [k, v.light])) as Record<K, string>;
const darkOf = <K extends string>(hex: Record<K, Hex>) =>
  Object.fromEntries(Object.entries<Hex>(hex).map(([k, v]) => [k, v.dark])) as Record<K, string>;

/** Cell fills per tone and status colors (shared with Today, lib/colors.ts), and text colors, per appearance. */
const PALETTE = {
  light: {
    // Late uses the phone's light-green disc; made up a true yellow, so it doesn't read as olive once softened.
    fill: { ...lightOf(TONE_HEX), late: "#7FD98F", madeup: "#F5C518", noData: "#E5E5EA", future: "none" },
    status: lightOf(STATUS_HEX),
    text: "#1C1C1E",
    muted: "#8E8E93",
  },
  dark: {
    fill: { ...darkOf(TONE_HEX), noData: "#3A3A3C", future: "none" },
    status: darkOf(STATUS_HEX),
    text: "#F2F2F7",
    muted: "#8E8E93",
  },
} as const;

/** One prayer row under the calendar, with times already formatted. */
export interface PanelPrayer {
  name: string;
  start: string;
  jamaat?: string;
  end: string;
  status?: PrayerStatusValue;
}

const escape = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * The calendar panel as one SVG, so it fits without scrolling and can color cells (Markdown can't):
 * the month Monday first with each day filled by its tone, the selected day outlined and today underlined,
 * a legend, then the selected day's prayers with their status.
 *
 * @param year - Full year.
 * @param month - Month, 0–11.
 * @param toneOf - Tone for a date key.
 * @param today - Today's date key.
 * @param selected - The selected date key.
 * @param title - Heading for the selected day.
 * @param prayers - The selected day's prayers.
 * @param appearance - Raycast's light or dark appearance.
 * @returns SVG markup.
 */
export function panelSvg(
  year: number,
  month: number,
  toneOf: (date: string) => DayTone,
  today: string,
  selected: string,
  title: string,
  prayers: PanelPrayer[],
  appearance: "light" | "dark",
): string {
  const colors = PALETTE[appearance];
  const { blanks, dates } = monthDays(year, month);
  const font = `font-family="-apple-system, system-ui, sans-serif"`;
  const text = (x: number, y: number, size: number, fill: string, content: string, extra = "") =>
    `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" ${font} ${extra}>${escape(content)}</text>`;
  const parts: string[] = [];

  ["M", "T", "W", "T", "F", "S", "S"].forEach((letter, i) =>
    parts.push(
      text(i * (CELL.width + CELL.gap) + CELL.width / 2, 11, 10, colors.muted, letter, `text-anchor="middle"`),
    ),
  );
  const top = 16;
  dates.forEach((date, i) => {
    const key = toDateKey(date);
    const tone = toneOf(key);
    const x = ((blanks + i) % 7) * (CELL.width + CELL.gap);
    const y = top + Math.floor((blanks + i) / 7) * (CELL.height + CELL.gap);
    const filled = tone !== "noData" && tone !== "future";
    const stroke =
      key === selected
        ? `stroke="${colors.text}" stroke-width="2.5"`
        : tone === "future"
          ? `stroke="${colors.muted}" stroke-opacity="0.4"`
          : "";
    // Fills are see-through, so the day number uses the panel's own text color.
    const ink = tone === "future" ? colors.muted : colors.text;
    parts.push(
      `<rect x="${x}" y="${y}" width="${CELL.width}" height="${CELL.height}" rx="5" fill="${colors.fill[tone]}" fill-opacity="${filled ? FILL_OPACITY : 1}" ${stroke}/>`,
    );
    parts.push(
      text(x + CELL.width / 2, y + 16, 12, ink, String(date.getDate()), `text-anchor="middle" font-weight="600"`),
    );
    if (key === today)
      parts.push(`<rect x="${x + CELL.width / 2 - 7}" y="${y + 19}" width="14" height="2" rx="1" fill="${ink}"/>`);
  });

  let y = top + Math.ceil((blanks + dates.length) / 7) * (CELL.height + CELL.gap) + 10;
  const legend: [DayTone, string][] = [
    ["ontime", "On time"],
    ["late", "Late"],
    ["madeup", "Made up"],
    ["missed", "Missed"],
    ["noData", "No data"],
  ];
  let x = 0;
  for (const [tone, label] of legend) {
    parts.push(
      `<rect x="${x}" y="${y}" width="10" height="10" rx="2" fill="${colors.fill[tone]}" fill-opacity="${FILL_OPACITY}"/>`,
    );
    parts.push(text(x + 14, y + 9, 11, colors.muted, label));
    x += 26 + label.length * 6;
  }
  parts.push(`<rect x="${x}" y="${y + 7}" width="12" height="2" rx="1" fill="${colors.muted}"/>`);
  parts.push(text(x + 16, y + 9, 11, colors.muted, "Today"));

  y += 34;
  parts.push(text(0, y, 14, colors.text, title, `font-weight="700"`));
  const columns = [0, 90, 160, 230];
  y += 20;
  ["Prayer", "Starts", "Jamaat", "Ends"].forEach((label, i) =>
    parts.push(text(columns[i], y, 10, colors.muted, label)),
  );
  parts.push(text(WIDTH, y, 10, colors.muted, "Status", `text-anchor="end"`));
  for (const prayer of prayers) {
    y += 22;
    // Names get 90px before the times; long custom titles are shortened rather than run over them.
    const name = prayer.name.length > 12 ? `${prayer.name.slice(0, 11)}…` : prayer.name;
    const cells = [name, prayer.start, prayer.jamaat ?? "—", prayer.end];
    // direction="ltr" keeps an Urdu or Arabic name starting at the left edge instead of running off it.
    cells.forEach((cell, i) =>
      parts.push(text(columns[i], y, 12, colors.text, cell, i === 0 ? `font-weight="600" direction="ltr"` : "")),
    );
    if (prayer.status) {
      const label = STATUS_LABELS[prayer.status];
      const color = colors.status[prayer.status];
      const pill = label.length * 5.8 + 14;
      parts.push(
        `<rect x="${WIDTH - pill}" y="${y - 13}" width="${pill}" height="18" rx="9" fill="${color}" fill-opacity="0.2"/>`,
      );
      parts.push(text(WIDTH - pill / 2, y, 10, color, label, `text-anchor="middle" font-weight="600"`));
    } else {
      parts.push(text(WIDTH, y, 12, colors.muted, "—", `text-anchor="end"`));
    }
  }
  const height = y + 8;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${height}" viewBox="0 0 ${WIDTH} ${height}">${parts.join("")}</svg>`;
}

/** Width of {@link panelSvg}, for sizing the image in Markdown. */
export const PANEL_WIDTH = WIDTH;
