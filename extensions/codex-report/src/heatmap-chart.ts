import type { SvgImage } from "./png";
import { agentColors, agentLabels, metrics } from "./report-data";
import { escapeXml } from "./svg";
import { Heatmap, HeatmapView, heatmapLevel } from "./heatmap-data";
import { WeeklyHeatmap, buildWeeklyHeatmap, weeklyBlocks } from "./heatmap-weekly";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const SOURCE_COLORS = { ...agentColors, tie: "#A78BFA" };
const SOURCE_LABELS = { ...agentLabels, tie: "Equal share" };
const OPACITY = [0, 0.35, 0.55, 0.75, 1];
const WIDTH = 560;
const LEFT = 80;
const TOP = 54;

// Raycast's UI slows down with every byte of markdown, so tiles stay tiny: one opaque path per fill.
type Tiles = Map<string, string>;
const round = (value: number) => Math.round(value * 10) / 10;

/** Color as if drawn with `opacity` over the track; opacity itself makes renderers composite per tile. */
function blend(color: string, track: string, opacity: number): string {
  if (opacity >= 1) return color;
  const channel = (hex: string, index: number) => parseInt(hex.slice(1 + index * 2, 3 + index * 2), 16);
  return `#${[0, 1, 2]
    .map((index) =>
      Math.round(channel(track, index) + (channel(color, index) - channel(track, index)) * opacity)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

function addTile(tiles: Tiles, week: number, row: number, size: number, gap: number, fill: string) {
  // An inset square with a round-joined stroke of the same color draws a rounded tile in a few bytes.
  const radius = Math.min(4, size / 4);
  const inner = round(size - 2 * radius);
  const square = `M${round(LEFT + week * (size + gap) + radius)} ${round(TOP + row * (size + gap) + radius)}h${inner}v${inner}h-${inner}z`;
  tiles.set(fill, (tiles.get(fill) ?? "") + square);
}

function tilesSvg(tiles: Tiles, size: number): string {
  const stroke = round(2 * Math.min(4, size / 4));
  return [...tiles]
    .map(
      ([fill, path]) =>
        `<path d="${path}" fill="${fill}" stroke="${fill}" stroke-width="${stroke}" stroke-linejoin="round"/>`,
    )
    .join("");
}

function dailyTiles(map: Heatmap, size: number, gap: number, track: string): Tiles {
  const tiles: Tiles = new Map();
  for (const cell of map.cells.filter((entry) => entry.inRange)) {
    const level = heatmapLevel(cell.value, map.thresholds);
    const fill =
      cell.dominantAgent && level > 0 ? blend(SOURCE_COLORS[cell.dominantAgent], track, OPACITY[level]) : track;
    addTile(tiles, cell.week, cell.weekday, size, gap, fill);
  }
  return tiles;
}

function weeklyTiles(weekly: WeeklyHeatmap, map: Heatmap, size: number, gap: number, track: string): Tiles {
  const tiles: Tiles = new Map();
  for (const week of weekly.weeks) {
    const blocks = weeklyBlocks(week, weekly.peak, map.agent, map.metric);
    for (let row = 0; row < 7; row++) {
      const agent = blocks[6 - row];
      addTile(tiles, week.week, row, size, gap, agent ? agentColors[agent] : track);
    }
  }
  return tiles;
}

function axisLabels(
  weekly: WeeklyHeatmap | undefined,
  size: number,
  gap: number,
  muted: string,
  formatValue: (value: number) => string,
): string {
  const labels = weekly
    ? [7, 0, 0, 4, 0, 0, 1].map((blocks) =>
        blocks && weekly.peak > 0 ? `≤ ${formatValue(weekly.peak * (blocks / 7) ** 2)}` : "",
      )
    : WEEKDAYS;
  const fontSize = Math.min(8, size * 0.85);
  return labels
    .map(
      (label, index) =>
        `<text x="${LEFT - 10}" y="${round(TOP + index * (size + gap) + size / 2)}" text-anchor="end" dominant-baseline="central" fill="${muted}" fill-opacity="0.8" font-size="${round(fontSize)}">${escapeXml(label)}</text>`,
    )
    .join("");
}

function dailyScale(
  map: Heatmap,
  bottom: number,
  track: string,
  text: string,
  muted: string,
  formatValue: (value: number) => string,
): string {
  return map.thresholds
    .map((value, index) => {
      const x = LEFT + index * 125;
      return `<rect x="${x}" y="${round(bottom + 32)}" width="11" height="11" rx="2" fill="${blend(text, track, OPACITY[index + 1])}"/><text x="${x + 16}" y="${round(bottom + 41)}" fill="${muted}" font-size="10">≤ ${escapeXml(formatValue(value))}</text>`;
    })
    .join("");
}

function monthLabels(map: Heatmap, size: number, gap: number, muted: string): string {
  const seen = new Set<string>();
  return map.cells
    .filter((cell) => cell.inRange)
    .map((cell) => {
      const month = cell.date.slice(0, 7);
      if (seen.has(month)) return "";
      seen.add(month);
      const date = new Date(`${cell.date}T12:00:00`);
      const label = date.toLocaleDateString("en-US", { month: "short" });
      return `<text x="${round(Math.min(532, LEFT + cell.week * (size + gap)))}" y="40" fill="${muted}" font-size="11">${label}</text>`;
    })
    .join("");
}

export function heatmapImage(
  map: Heatmap,
  dark: boolean,
  formatValue: (value: number) => string,
  view: HeatmapView = "daily",
): SvgImage {
  const track = dark ? "#303030" : "#eeeeee";
  const text = dark ? "#eeeeee" : "#222222";
  const muted = dark ? "#aaaaaa" : "#666666";
  const gap = map.weeks > 32 ? 2.5 : 4;
  const size = Math.min(17, (WIDTH - LEFT - gap * (map.weeks - 1)) / map.weeks);
  const bottom = round(TOP + 7 * (size + gap));
  const weekly = view === "weekly" ? buildWeeklyHeatmap(map) : undefined;
  const days = axisLabels(weekly, size, gap, muted, formatValue);
  const agents = map.agent === "all" ? (["codex", "claude"] as const) : [map.agent];
  const legendItems = agents.map((agent) => ({ label: agentLabels[agent], color: agentColors[agent] }));
  if (!weekly && map.cells.filter((cell) => cell.inRange).some((entry) => entry.dominantAgent === "tie"))
    legendItems.push({ label: SOURCE_LABELS.tie, color: SOURCE_COLORS.tie });
  const legend = legendItems
    .map(
      (item, index) =>
        `<circle cx="${LEFT + index * 95}" cy="${bottom + 15}" r="4" fill="${item.color}"/><text x="${LEFT + index * 95 + 10}" y="${bottom + 19}" fill="${muted}" font-size="11">${item.label}</text>`,
    )
    .join("");
  const peak = weekly?.peak ?? map.thresholds[3];
  let scale = dailyScale(map, bottom, track, text, muted, formatValue);
  if (weekly)
    scale = `<text x="${LEFT}" y="${bottom + 41}" fill="${muted}" font-size="10">Square-root scale · blocks approximate agent shares</text>`;
  if (peak === 0)
    scale = `<text x="${LEFT}" y="${bottom + 41}" fill="${muted}" font-size="10">${map.metric === "costs" ? "No priced costs" : "No usage for this metric"}</text>`;
  const cells = tilesSvg(weekly ? weeklyTiles(weekly, map, size, gap, track) : dailyTiles(map, size, gap, track), size);
  const title = `Activity · ${metrics[map.metric]} · ${view === "daily" ? "Daily" : "Weekly"}`;
  return {
    width: WIDTH,
    height: Math.ceil(bottom + 57),
    body: `<g font-family="-apple-system,Helvetica,sans-serif"><text x="0" y="17" fill="${text}" font-size="14" font-weight="600">${title}</text>${monthLabels(map, size, gap, muted)}${days}${cells}${legend}${scale}</g>`,
  };
}
