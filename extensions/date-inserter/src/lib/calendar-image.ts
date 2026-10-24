import { format, getDay, isSameDay, isSameMonth } from "date-fns";
import { buildMonthPage, DAYS_PER_WEEK, weekNumber, WeekNumbering, WeekStartsOn, WEEKS_PER_PAGE } from "./calendar";
import { LanguageConfig } from "./locales";
import {
  DARK,
  estimateTextWidth,
  fitText,
  group,
  IMAGE_WIDTH,
  IMAGE_HEIGHT,
  LIGHT,
  Palette,
  round,
  svgDocument,
  text,
  title,
  TITLE_FONT_SIZE,
  TITLE_HEIGHT,
  TITLE_MARGIN,
} from "./svg";

export interface CalendarImageOptions {
  selected: Date;
  today: Date;
  weekStartsOn: WeekStartsOn;
  /** Undefined hides the week-number column. */
  weekNumbering?: WeekNumbering;
  language: LanguageConfig;
  dark: boolean;
  /**
   * The text that will be inserted, drawn at the right of the title row. Raycast
   * asks extensions not to update the navigation title of a root command, so
   * the preview lives in the image instead.
   */
  output: { text: string; isError: boolean };
}

const WEEKDAY_ROW_HEIGHT = 24;
const WEEK_COLUMN_WIDTH = 48;
const OUTPUT_FONT_SIZE = 16;
const ROW_HEIGHT = (IMAGE_HEIGHT - TITLE_HEIGHT - WEEKDAY_ROW_HEIGHT) / WEEKS_PER_PAGE;

function weekdayColor(weekday: number, palette: Palette, fallback: string): string {
  if (weekday === 0) return palette.sunday;
  if (weekday === 6) return palette.saturday;
  return fallback;
}

/** Renders one month page, including the selection highlight, as an SVG document. */
export function renderCalendarSvg(options: CalendarImageOptions): string {
  const { selected, today, weekStartsOn, weekNumbering, language } = options;
  const palette = options.dark ? DARK : LIGHT;
  const days = buildMonthPage(selected, weekStartsOn);

  const gridLeft = weekNumbering ? WEEK_COLUMN_WIDTH : 0;
  const cellWidth = (IMAGE_WIDTH - gridLeft) / DAYS_PER_WEEK;
  const gridTop = TITLE_HEIGHT + WEEKDAY_ROW_HEIGHT;
  const headerY = TITLE_HEIGHT + WEEKDAY_ROW_HEIGHT / 2;

  const heading = format(selected, language.monthTitleFormat, { locale: language.locale });
  const parts: string[] = [title(heading, palette)];

  // Output preview, right-aligned and shortened so it never runs into the title.
  const available = IMAGE_WIDTH - TITLE_MARGIN * 3 - estimateTextWidth(heading, TITLE_FONT_SIZE);
  parts.push(
    text(
      IMAGE_WIDTH - TITLE_MARGIN,
      TITLE_HEIGHT / 2,
      fitText(options.output.text, OUTPUT_FONT_SIZE, available),
      `text-anchor="end" font-size="${OUTPUT_FONT_SIZE}" font-weight="600" ` +
        `fill="${options.output.isError ? palette.error : palette.label}"`,
    ),
  );

  // Header row: weekday names, plus the week-number column label.
  const header: string[] = [];
  if (weekNumbering) {
    header.push(text(WEEK_COLUMN_WIDTH / 2, headerY, language.weekLabel, `fill="${palette.label}"`));
  }
  days.slice(0, DAYS_PER_WEEK).forEach((date, column) => {
    const weekday = getDay(date);
    header.push(
      text(
        gridLeft + column * cellWidth + cellWidth / 2,
        headerY,
        language.weekdayLabels[weekday],
        `fill="${weekdayColor(weekday, palette, palette.label)}"`,
      ),
    );
  });
  parts.push(group(`font-size="13" font-weight="600"`, header));

  if (weekNumbering) {
    const weeks = Array.from({ length: WEEKS_PER_PAGE }, (_, row) =>
      text(
        WEEK_COLUMN_WIDTH / 2,
        gridTop + row * ROW_HEIGHT + ROW_HEIGHT / 2,
        weekNumber(days[row * DAYS_PER_WEEK], weekNumbering),
      ),
    );
    parts.push(group(`font-size="14" fill="${palette.label}"`, weeks));
  }

  // Day numbers are bucketed by color and fading so each style is written once.
  const buckets = new Map<string, string[]>();
  let todayMark = "";
  days.forEach((date, index) => {
    const row = Math.floor(index / DAYS_PER_WEEK);
    const x = gridLeft + (index % DAYS_PER_WEEK) * cellWidth;
    const y = gridTop + row * ROW_HEIGHT;
    const cx = x + cellWidth / 2;
    const cy = y + ROW_HEIGHT / 2;
    const fill = weekdayColor(getDay(date), palette, palette.text);
    const opacity = isSameMonth(date, selected) ? 1 : 0.3;

    if (isSameDay(date, selected)) {
      parts.push(
        `<rect x="${round(x + 3)}" y="${round(y + 2)}" width="${round(cellWidth - 6)}" height="${round(ROW_HEIGHT - 4)}" rx="8" fill="${palette.selection}"/>`,
      );
    }
    if (isSameDay(date, today)) {
      todayMark =
        `<g opacity="${opacity}">` +
        `<circle cx="${round(cx)}" cy="${round(cy)}" r="${round(ROW_HEIGHT / 2 - 4)}" fill="none" stroke="${palette.todayRing}" stroke-width="2.5"/>` +
        text(cx, cy + 1, date.getDate(), `font-size="19" font-weight="700" fill="${fill}"`) +
        `</g>`;
      return;
    }
    const key = `fill="${fill}" opacity="${opacity}"`;
    buckets.set(key, [...(buckets.get(key) ?? []), text(cx, cy + 1, date.getDate())]);
  });
  const numbers = [...buckets].map(([attrs, texts]) => group(attrs, texts));
  parts.push(group(`font-size="19" font-weight="500"`, numbers), todayMark);

  return svgDocument(parts);
}
