import { Image } from "@raycast/api";
import { WeekRow } from "./month";
import { CellStyle } from "./preferences";

/** Pitch from one day to the next. The tile is smaller, leaving `GAP` between neighbours. */
const CELL = 13;
const GAP = 3.2;
const TILE = CELL - GAP;

const STROKE = 1.5;
/** How far the ✕ stays clear of the tile border. */
const CROSS_INSET = 2.2;
const RADIUS = 1.8;

const HEADER_HEIGHT = 12;
const LETTER_SIZE = 8.5;

/** Emoji-style tiles are fixed colours — the real ⬜ and ✅ don't follow the theme either. */
const EMPTY_FILL = "#F4F4F5";
const EMPTY_EDGE = "#B4B4BB";
const DONE_FILL = "#34C759";
const DONE_MARK = "#FFFFFF";

interface CalendarSvgOptions {
  weeks: WeekRow[];
  marked: Set<number>;
  /** Column letters drawn above the grid, or `undefined` for the bare grid. */
  letters?: string[];
  style: CellStyle;
}

function drawnTile(x: number, y: number, isMarked: boolean, ink: string): string {
  const box = `<rect x="${x}" y="${y}" width="${TILE}" height="${TILE}" fill="none" stroke="${ink}" stroke-width="${STROKE}"/>`;
  if (!isMarked) return box;

  const a = CROSS_INSET;
  const b = TILE - CROSS_INSET;
  const cross = `<path d="M${x + a} ${y + a}L${x + b} ${y + b}M${x + b} ${y + a}L${x + a} ${y + b}" fill="none" stroke="${ink}" stroke-width="${STROKE}"/>`;
  return box + cross;
}

function emojiTile(x: number, y: number, isMarked: boolean): string {
  if (!isMarked) {
    return `<rect x="${x}" y="${y}" width="${TILE}" height="${TILE}" rx="${RADIUS}" fill="${EMPTY_FILL}" stroke="${EMPTY_EDGE}" stroke-width="0.8"/>`;
  }

  const at = (fx: number, fy: number) => `${x + fx * TILE} ${y + fy * TILE}`;
  return [
    `<rect x="${x}" y="${y}" width="${TILE}" height="${TILE}" rx="${RADIUS}" fill="${DONE_FILL}"/>`,
    `<path d="M${at(0.24, 0.52)}L${at(0.42, 0.71)}L${at(0.76, 0.3)}" fill="none" stroke="${DONE_MARK}" stroke-width="${TILE * 0.16}"/>`,
  ].join("");
}

function buildSvg({ weeks, marked, letters, style }: CalendarSvgOptions, ink: string): string {
  const top = letters ? HEADER_HEIGHT : 0;
  const width = 7 * CELL - GAP;
  const height = top + weeks.length * CELL - GAP;
  const parts: string[] = [];

  letters?.forEach((letter, column) => {
    const x = column * CELL + TILE / 2;
    parts.push(
      `<text x="${x}" y="${HEADER_HEIGHT - 4}" font-family="Helvetica,Arial,sans-serif" font-size="${LETTER_SIZE}" font-weight="600" text-anchor="middle" fill="${ink}">${letter}</text>`,
    );
  });

  weeks.forEach((week, row) => {
    week.forEach((day, column) => {
      if (day === null) return;
      const x = column * CELL;
      const y = top + row * CELL;
      parts.push(style === "emoji" ? emojiTile(x, y, marked.has(day)) : drawnTile(x, y, marked.has(day), ink));
    });
  });

  const pad = STROKE / 2;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-pad} ${-pad} ${width + STROKE} ${height + STROKE}"`,
    ` width="${width + STROKE}" height="${height + STROKE}">`,
    `<g stroke-linecap="round" stroke-linejoin="round">`,
    parts.join(""),
    `</g></svg>`,
  ].join("");
}

function dataUri(svg: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
}

/** The mini calendar as a theme-aware menu bar icon: black ink on light, white on dark. */
export function calendarIcon(options: CalendarSvgOptions): Image.ImageLike {
  return {
    source: {
      light: dataUri(buildSvg(options, "#000000")),
      dark: dataUri(buildSvg(options, "#FFFFFF")),
    },
  };
}
