import { environment } from "@raycast/api";
import { percentLeft, QuotaWindow } from "./quota";

// Renders quota windows as SVG (data URI) images for detail-pane markdown.
// Raycast markdown can't style bars, so typography and bars are drawn here and themed via environment.appearance.

const WIDTH = 380;
const BAR_HEIGHT = 8;
const SEGMENT_GAP = 6;
const FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif";

const THEMES = {
  dark: { text: "#EDEDEF", muted: "#8E8E93", track: "rgba(255,255,255,0.08)" },
  light: { text: "#1D1D1F", muted: "#6E6E73", track: "rgba(0,0,0,0.07)" },
};
type Theme = (typeof THEMES)["dark"];

/** Fill color by how much of the window is left. Shared with list accessories so both agree. */
export function remainingHex(left: number): string {
  if (left < 20) return "#E5534B";
  if (left < 70) return "#E8A23A";
  return "#4CA67A";
}

/** One account's quota, as input for the provider overview. */
export type AccountWindows = { windows: QuotaWindow[] };

/** One line in the overview's account list. */
export type AccountRow = { name: string; summary: string; statusHex: string };

/** Markdown image showing every quota window as label, big "percent left" and a rounded bar that drains. */
export function quotaChartMarkdown(windows: QuotaWindow[]): string {
  const theme = currentTheme();
  const blocks = windows.map((window, i) => {
    const left = percentLeft(window);
    return block(i * 100, theme, {
      label: window.label,
      right: window.resetsAt ? untilLabel("Resets", window.resetsAt) : "",
      big: left === null ? "?" : `${Math.round(left)}%`,
      unit: "left",
      segments: [left],
    });
  });
  return image(blocks, windows.length * 100 - 24);
}

/**
 * Provider overview: per limit (e.g. Weekly), the summed "% left of N%" across accounts and one bar segment per
 * account reporting that limit, like the Management Center's provider cards. The account list follows below
 * in the same image so the whole pane scrolls as one.
 */
export function providerOverviewMarkdown(accounts: AccountWindows[], rows: AccountRow[]): string {
  const theme = currentTheme();
  const labels = orderedLabels(accounts);
  const blocks = labels.map((label, i) => {
    // Only accounts that report this limit get a segment, so the count and the bar always agree.
    const windows = accounts.flatMap((a) => a.windows.filter((w) => w.label === label));
    const lefts = windows.map(percentLeft);
    const known = lefts.filter((v): v is number => v !== null);
    const nextReset = Math.min(...windows.map((w) => w.resetsAt ?? Infinity));
    return block(i * 124, theme, {
      label,
      right: `${known.length} ${known.length === 1 ? "account" : "accounts"}`,
      big: `${Math.round(known.reduce((sum, v) => sum + v, 0))}%`,
      unit: `left of ${known.length * 100}%`,
      segments: lefts,
      footer: Number.isFinite(nextReset)
        ? `${untilLabel("Next reset", nextReset)}, ${dateLabel(nextReset)}`
        : undefined,
    });
  });
  const listTop = labels.length * 124 + 8;
  blocks.push(accountList(listTop, theme, rows));
  return image(blocks, listTop + 24 + rows.length * ROW_HEIGHT);
}

const ROW_HEIGHT = 30;

function accountList(y: number, theme: Theme, rows: AccountRow[]): string {
  const header = `<text x="0" y="${y + 14}" font-size="13" font-weight="500" fill="${theme.muted}">Accounts</text>`;
  const lines = rows.map((row, i) => {
    const baseline = y + 24 + i * ROW_HEIGHT + 20;
    // No text measuring in SVG: estimate widths to keep the name clear of the right-aligned summary.
    const maxNameChars = Math.floor((WIDTH - 16 - row.summary.length * 6.6 - 16) / 7.4);
    return [
      `<circle cx="4" cy="${baseline - 4.5}" r="4" fill="${row.statusHex}"/>`,
      `<text x="16" y="${baseline}" font-size="13" fill="${theme.text}">${escape(truncate(row.name, maxNameChars))}</text>`,
      `<text x="${WIDTH}" y="${baseline}" font-size="12" text-anchor="end" fill="${theme.muted}">${escape(row.summary)}</text>`,
    ].join("");
  });
  return header + lines.join("");
}

function truncate(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, Math.max(1, max - 1))}…`;
}

type Block = {
  label: string;
  right: string;
  big: string;
  unit: string;
  /** Percent left per segment; null draws an empty track. */
  segments: (number | null)[];
  footer?: string;
};

function block(y: number, theme: Theme, b: Block): string {
  const count = Math.max(1, b.segments.length);
  const segmentWidth = (WIDTH - SEGMENT_GAP * (count - 1)) / count;
  const bars = b.segments.map((left, i) => {
    const x = i * (segmentWidth + SEGMENT_GAP);
    const track = `<rect x="${x}" y="${y + 68}" width="${segmentWidth}" height="${BAR_HEIGHT}" rx="${BAR_HEIGHT / 2}" fill="${theme.track}"/>`;
    if (left === null || left <= 0) return track;
    const fill = Math.max(BAR_HEIGHT, (left / 100) * segmentWidth);
    return `${track}<rect x="${x}" y="${y + 68}" width="${fill}" height="${BAR_HEIGHT}" rx="${BAR_HEIGHT / 2}" fill="${remainingHex(left)}"/>`;
  });

  return [
    `<text x="0" y="${y + 14}" font-size="13" font-weight="500" fill="${theme.muted}">${escape(b.label)}</text>`,
    `<text x="${WIDTH}" y="${y + 14}" font-size="12" text-anchor="end" fill="${theme.muted}">${escape(b.right)}</text>`,
    `<text x="0" y="${y + 52}" fill="${theme.text}">`,
    `<tspan font-size="30" font-weight="600">${escape(b.big)}</tspan>`,
    `<tspan font-size="13" fill="${theme.muted}" dx="6">${escape(b.unit)}</tspan>`,
    `</text>`,
    ...bars,
    b.footer ? `<text x="0" y="${y + 98}" font-size="12" fill="${theme.muted}">${escape(b.footer)}</text>` : "",
  ].join("");
}

/** Weekly first, then 5-Hour, then the rest in first-seen order. */
function orderedLabels(accounts: AccountWindows[]): string[] {
  const seen = [...new Set(accounts.flatMap((a) => a.windows.map((w) => w.label)))];
  const rank = (label: string) => (label === "Weekly" ? 0 : label === "5-Hour" ? 1 : 2);
  return seen.sort((a, b) => rank(a) - rank(b));
}

function image(blocks: string[], height: number): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${height}" viewBox="0 0 ${WIDTH} ${height}" font-family="${FONT}">${blocks.join("")}</svg>`;
  return `![Quota](data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")})`;
}

function currentTheme(): Theme {
  return THEMES[environment.appearance === "light" ? "light" : "dark"];
}

/** "Resets in 2h 13m", or "Resets now" once the time has passed. */
function untilLabel(prefix: string, ms: number): string {
  const d = duration(ms);
  return d === "now" ? `${prefix} now` : `${prefix} in ${d}`;
}

/** "2h 13m" / "6d 3h" until `ms`, or "now" if it's already past. */
function duration(ms: number): string {
  const minutes = Math.round((ms - Date.now()) / 60_000);
  if (minutes <= 0) return "now";
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 24 * 60) return minutes % 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes / 60}h`;
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
}

function dateLabel(ms: number): string {
  return new Date(ms).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function escape(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
