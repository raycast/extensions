import type { ChartRange } from "../lib/yahoo/chart";
import { escapeXml, svgDocument } from "./svg";
import type { ChartTheme } from "./theme";

export function num(v: number): string {
  return String(Math.round(v * 100) / 100);
}

export function textEl(
  theme: ChartTheme,
  x: number,
  y: number,
  anchor: "start" | "middle" | "end",
  text: string,
  fill: string,
  size = 10,
  weight?: number,
): string {
  const bold = weight ? ` font-weight="${weight}"` : "";
  return `<text x="${num(x)}" y="${num(y)}" fill="${fill}" font-size="${size}"${bold} text-anchor="${anchor}" font-family="${theme.fontFamily}">${escapeXml(text)}</text>`;
}

/** Cuts `text` to `maxChars`, ending in "…" when shortened. */
export function truncate(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return text.slice(0, Math.max(1, maxChars - 1)) + "…";
}

export function emptyChart(theme: ChartTheme, width: number, height: number, message: string): string {
  return svgDocument(
    `<text x="${width / 2}" y="${height / 2}" fill="${theme.mutedText}" font-size="13" text-anchor="middle" dominant-baseline="middle" font-family="${theme.fontFamily}">${escapeXml(message)}</text>`,
    width,
    height,
  );
}

const FORMATS: Record<ChartRange, Intl.DateTimeFormatOptions> = {
  "1D": { hour: "2-digit", minute: "2-digit", hourCycle: "h23" },
  "1W": { month: "short", day: "numeric" },
  "1M": { month: "short", day: "numeric" },
  "1Y": { month: "short", year: "numeric" },
  "5Y": { month: "short", year: "numeric" },
};

/** 1D shows times of day in the user's time zone; longer ranges show calendar dates in UTC. */
export function formatChartDate(t: number, range: ChartRange): string {
  const timeZone = range === "1D" ? undefined : "UTC";
  return new Intl.DateTimeFormat("en-US", { ...FORMATS[range], timeZone }).format(new Date(t));
}

/** Vertical band reserved for the top labels and the bottom labels. */
export const TOP_BAND = 18;
export const BOTTOM_BAND = 18;
