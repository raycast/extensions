export type ChartStatus = "success" | "warn" | "error" | "cancelled";

export interface ChartPoint {
  time: Date;
  seconds: number;
  status: ChartStatus;
}

const WIDTH = 760;
const HEIGHT = 260;
const MARGIN = { top: 16, right: 16, bottom: 32, left: 44 };
const DAY_MS = 24 * 60 * 60 * 1000;

const STATUS_COLORS: Record<ChartStatus, string> = {
  success: "#22C55E",
  warn: "#F59E0B",
  error: "#EF4444",
  cancelled: "#A3A3A3",
};
const AXIS_COLOR = "#8A8A8A";
const GRID_COLOR = "#8A8A8A33";

const niceStep = (maxMinutes: number): number => {
  const steps = [0.5, 1, 2, 5, 10, 15, 30, 60, 120, 240];
  return steps.find((step) => maxMinutes / step <= 4) ?? 480;
};

const formatTick = (minutes: number): string =>
  minutes >= 60 ? `${Math.round((minutes / 60) * 10) / 10}h` : `${Math.round(minutes * 10) / 10}m`;

/**
 * Scatter of execution time per run across the window, coloured by status, like the dbt Cloud "Recent runs" chart.
 * Returned as a data URI so it can be embedded in Detail markdown.
 */
export function buildDurationChart(points: ChartPoint[], windowStart: Date, windowEnd: Date): string | null {
  if (points.length === 0) return null;

  const plotWidth = WIDTH - MARGIN.left - MARGIN.right;
  const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom;
  const start = windowStart.getTime();
  const span = Math.max(windowEnd.getTime() - start, 1);

  const maxMinutes = Math.max(...points.map((point) => point.seconds / 60), 0.5);
  const step = niceStep(maxMinutes);
  const yMax = Math.ceil(maxMinutes / step) * step;

  const x = (time: number) => MARGIN.left + ((time - start) / span) * plotWidth;
  const y = (minutes: number) => MARGIN.top + plotHeight - (minutes / yMax) * plotHeight;

  const parts: string[] = [];

  for (let tick = 0; tick <= yMax + 1e-9; tick += step) {
    parts.push(
      `<line x1="${MARGIN.left}" x2="${WIDTH - MARGIN.right}" y1="${y(tick)}" y2="${y(tick)}" stroke="${GRID_COLOR}"/>`,
      `<text x="${MARGIN.left - 6}" y="${y(tick) + 4}" text-anchor="end">${formatTick(tick)}</text>`,
    );
  }

  const days = Math.round(span / DAY_MS);
  const labelEvery = days <= 7 ? 1 : days <= 14 ? 2 : 5;
  const firstDay = new Date(windowStart);
  firstDay.setHours(0, 0, 0, 0);
  for (let day = firstDay.getTime() + DAY_MS, i = 1; day < windowEnd.getTime(); day += DAY_MS, i++) {
    if (i % labelEvery !== 0) continue;
    const label = new Date(day).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    parts.push(`<text x="${x(day)}" y="${HEIGHT - 10}" text-anchor="middle">${label}</text>`);
  }

  parts.push(
    `<line x1="${MARGIN.left}" x2="${MARGIN.left}" y1="${MARGIN.top}" y2="${MARGIN.top + plotHeight}" stroke="${AXIS_COLOR}"/>`,
    `<line x1="${MARGIN.left}" x2="${WIDTH - MARGIN.right}" y1="${MARGIN.top + plotHeight}" y2="${MARGIN.top + plotHeight}" stroke="${AXIS_COLOR}"/>`,
  );

  // Draw errors last so they stay visible on top of overlapping successes
  const ordered = [...points].sort((a, b) => (a.status === "error" ? 1 : 0) - (b.status === "error" ? 1 : 0));
  for (const point of ordered) {
    const cx = x(point.time.getTime());
    const cy = y(point.seconds / 60);
    parts.push(`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="4.5" fill="${STATUS_COLORS[point.status]}"/>`);
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" font-family="-apple-system, Helvetica, sans-serif" font-size="11" fill="${AXIS_COLOR}">${parts.join("")}</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}
