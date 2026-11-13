import type { Direction } from "../lib/format";
import { textEl, truncate } from "./shared";
import { svgDocument } from "./svg";
import { chartTheme, type Appearance } from "./theme";

export type FigureTone = Direction | "muted" | "warning";

export interface Figure {
  label: string;
  value: string;
  tone?: FigureTone;
}

export const FIGURE_ROW_HEIGHT = 28;
const PAD_X = 12;
const FONT_SIZE = 13;
const CHAR_WIDTH = FONT_SIZE * 0.6;

/**
 * The label/value rows under each chart, drawn to look like Raycast's metadata panel (striped rows,
 * muted labels, right-aligned values). Raycast pins that panel to the bottom of the pane; as part of
 * the markdown, the rows scroll with everything else.
 */
export function renderFigures(rows: Figure[], opts: { width: number; appearance: Appearance }): string {
  const theme = chartTheme(opts.appearance);
  const { width } = opts;
  const stripe = opts.appearance === "dark" ? "rgba(255,255,255,0.045)" : "rgba(0,0,0,0.04)";
  const warning = opts.appearance === "dark" ? "#e0b341" : "#a87a00";
  const toneFill: Record<FigureTone, string> = {
    up: theme.up,
    down: theme.down,
    muted: theme.mutedText,
    warning,
  };
  let inner = "";
  rows.forEach((row, i) => {
    const top = i * FIGURE_ROW_HEIGHT;
    if (i % 2 === 0) {
      inner += `<rect x="0" y="${top}" width="${width}" height="${FIGURE_ROW_HEIGHT}" rx="6" fill="${stripe}"/>`;
    }
    const baseline = top + 18.5;
    const valueChars = Math.floor((width - 2 * PAD_X - row.label.length * CHAR_WIDTH - 16) / CHAR_WIDTH);
    inner += textEl(theme, PAD_X, baseline, "start", row.label, theme.mutedText, FONT_SIZE);
    const fill = row.tone ? toneFill[row.tone] : theme.text;
    inner += textEl(theme, width - PAD_X, baseline, "end", truncate(row.value, valueChars), fill, FONT_SIZE, 500);
  });
  return svgDocument(inner, width, rows.length * FIGURE_ROW_HEIGHT);
}
