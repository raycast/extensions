import { compactPlayers, PlayerPoint } from "./players";

const LINE = "#a4d007";
const MAX_POINTS = 300;
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

// Buckets by time rather than by index, because the full history mixes hourly, daily, and monthly points.
// Each bucket keeps its highest point so peaks survive.
export function downsample(points: PlayerPoint[], target = MAX_POINTS): PlayerPoint[] {
  if (points.length <= target) return points;
  const start = points[0][0];
  const span = points[points.length - 1][0] - start || 1;
  const buckets = new Map<number, PlayerPoint>();
  for (const point of points) {
    const bucket = Math.min(target - 1, Math.floor(((point[0] - start) / span) * target));
    const kept = buckets.get(bucket);
    if (!kept || point[1] > kept[1]) buckets.set(bucket, point);
  }
  return [...buckets.values()].sort((a, b) => a[0] - b[0]);
}

function niceStep(max: number, ticks: number) {
  const raw = max / ticks;
  const magnitude = 10 ** Math.floor(Math.log10(raw || 1));
  const step = [1, 2, 2.5, 5, 10].map((factor) => factor * magnitude).find((value) => value >= raw);
  return step ?? 10 * magnitude;
}

function dateLabel(ms: number, span: number) {
  const date = new Date(ms);
  if (span <= 3 * DAY) {
    return date.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  }
  if (span <= 400 * DAY) return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  return date.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
}

const TICK_STEPS = [6 * HOUR, 12 * HOUR, DAY, 2 * DAY, 7 * DAY, 14 * DAY];
const MAX_TICKS = 6;

// Short ranges get ticks on whole hours or local midnights; longer ones are spread evenly
function xTicks(start: number, end: number) {
  const span = end - start;
  const step = TICK_STEPS.find((value) => span / value <= MAX_TICKS);
  if (!step) return Array.from({ length: 5 }, (_, index) => start + (span * index) / 4);
  const first = new Date(start);
  first.setHours(step < DAY ? Math.ceil(first.getHours() / (step / HOUR)) * (step / HOUR) : 24, 0, 0, 0);
  if (step < DAY && first.getTime() < start) first.setTime(first.getTime() + step);
  const ticks: number[] = [];
  // Whole-day steps go by calendar day, so a daylight saving change doesn't move them off midnight
  for (const tick = first; tick.getTime() <= end; ) {
    ticks.push(tick.getTime());
    if (step < DAY) tick.setTime(tick.getTime() + step);
    else tick.setDate(tick.getDate() + step / DAY);
  }
  return ticks;
}

const escape = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;");

export function renderPlayerChart(
  input: PlayerPoint[],
  { width = 720, height = 260, dark = true }: { width?: number; height?: number; dark?: boolean } = {},
) {
  const points = downsample(input);
  if (points.length < 2) return undefined;
  const text = dark ? "#9aa0a6" : "#5f6368";
  const grid = dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)";
  const left = 48;
  const right = 12;
  const top = 12;
  const bottom = 28;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;

  const start = points[0][0];
  const end = points[points.length - 1][0];
  const span = end - start || 1;
  const peak = Math.max(...points.map(([, players]) => players), 1);
  const step = niceStep(peak, 4);
  const yMax = Math.ceil(peak / step) * step;

  const x = (ms: number) => left + ((ms - start) / span) * plotWidth;
  const y = (players: number) => top + plotHeight - (players / yMax) * plotHeight;
  const fixed = (value: number) => value.toFixed(1);

  const line = points.map(([ms, players], index) => `${index ? "L" : "M"}${fixed(x(ms))},${fixed(y(players))}`);
  const baseline = fixed(top + plotHeight);
  const area = `${line.join("")}L${fixed(x(end))},${baseline}L${fixed(x(start))},${baseline}Z`;

  const gridLines: string[] = [];
  for (let value = 0; value <= yMax + step / 2; value += step) {
    const lineY = fixed(y(value));
    gridLines.push(
      `<line x1="${left}" x2="${width - right}" y1="${lineY}" y2="${lineY}" stroke="${grid}" stroke-width="1"/>`,
      `<text x="${left - 8}" y="${lineY}" fill="${text}" font-size="11" text-anchor="end" dominant-baseline="middle">${value ? compactPlayers(value) : "0"}</text>`,
    );
  }

  const xLabels = xTicks(start, end).map((ms) => {
    const position = x(ms);
    // Labels at the edges would be cut off if centered
    const anchor = position < left + 30 ? "start" : position > width - right - 30 ? "end" : "middle";
    return `<text x="${fixed(position)}" y="${height - 8}" fill="${text}" font-size="11" text-anchor="${anchor}">${escape(dateLabel(ms, span))}</text>`;
  });

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif">`,
    `<defs><linearGradient id="fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${LINE}" stop-opacity="0.35"/><stop offset="1" stop-color="${LINE}" stop-opacity="0.02"/></linearGradient></defs>`,
    ...gridLines,
    `<path d="${area}" fill="url(#fill)"/>`,
    `<path d="${line.join("")}" fill="none" stroke="${LINE}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`,
    ...xLabels,
    "</svg>",
  ].join("");
}

export const chartMarkdown = (svg: string) =>
  `![Player count chart](data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")})`;
