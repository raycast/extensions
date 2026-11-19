import type { CaffeineIntake, Settings } from "../types";
import { calculateResidualCaffeine, calculateTotalResidualCaffeine, HOUR, MINUTE } from "./caffeineModel";
import type { historyStats } from "./history";

type Appearance = "light" | "dark";
type SeriesColor = "accent" | "forecast";
type Stat = { label: string; value: string; unit?: "mg"; color?: SeriesColor };
type Point = { x: number; y: number };

const W = 720;
const H = 304;
const HEADER_LEFT = 4;
const LEFT = 56;
const RIGHT = W - 30;
const TOP = 116;
const BOTTOM = 242;
const LEGEND_Y = 285;

const palettes = {
  light: {
    ink: "#222220",
    muted: "#595550",
    accent: "#82451f",
    forecast: "#12685b",
    threshold: "#884561",
  },
  dark: {
    ink: "#f7f2ec",
    muted: "#c6bdb5",
    accent: "#f0ad74",
    forecast: "#85d2bd",
    threshold: "#e6a2c0",
  },
};

const LOGGED_DASH = "4 3";
const LIMIT_DASH = "6 4";

const clock = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const dateTime = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export const formatClock = (date: Date) => clock.format(date);
export const formatDateTime = (date: Date) => dateTime.format(date);
const decimal = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 });

export const formatMg = (amount: number) => `${decimal.format(amount)} mg`;

function mgStat(label: string, amount: number, color?: SeriesColor): Stat {
  return { label, value: decimal.format(amount), unit: "mg", color };
}

function escapeXml(value: string): string {
  const entities: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" };
  return value.replace(/[&<>"']/g, (character) => entities[character]);
}

function text(x: number, y: number, content: string, fill: string, size = 12, attrs = "") {
  return `<text x="${x}" y="${y}" fill="${fill}" font-size="${size}" ${attrs}>${escapeXml(content)}</text>`;
}

function line(x1: number, y1: number, x2: number, y2: number, stroke: string, attrs = "") {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" ${attrs}/>`;
}

function dot(x: number, y: number, radius: number, fill: string, attrs = "") {
  return `<circle cx="${x}" cy="${y}" r="${radius}" fill="${fill}" ${attrs}/>`;
}

function diamond(x: number, y: number, radius: number, fill: string) {
  return `<path d="M ${x} ${y - radius} l ${radius} ${radius} -${radius} ${radius} -${radius} -${radius} Z" fill="${fill}"/>`;
}

function scaleFor(max: number) {
  const ceiling = Math.max(20, max);
  const unit = 10 ** Math.floor(Math.log10(ceiling / 4));
  const step = [1, 2, 2.5, 5, 10].map((value) => value * unit).find((value) => ceiling <= value * 4) ?? 10 * unit;
  return {
    step,
    y: (amount: number) => BOTTOM - (amount / step / 4) * (BOTTOM - TOP),
  };
}

function statsMarkdown({
  appearance,
  title,
  description,
  stats,
  max,
  color,
  draw,
}: {
  appearance: Appearance;
  title: string;
  description: string;
  stats: Stat[];
  max: number;
  color?: SeriesColor;
  draw: (scale: ReturnType<typeof scaleFor>, palette: (typeof palettes)[Appearance]) => string[];
}) {
  const palette = palettes[appearance];
  const scale = scaleFor(max);
  const summary = stats.map(({ label, value, unit }) => `${label} ${value}${unit ? ` ${unit}` : ""}.`).join(" ");
  const alt = `${title}. ${summary} ${description}`;
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="system-ui, sans-serif" style="font-variant-numeric: tabular-nums" role="img" aria-label="${escapeXml(alt)}">`,
    ...(color
      ? [
          '<defs><pattern id="dots" width="5" height="5" patternUnits="userSpaceOnUse">',
          dot(2.5, 2.5, 1, palette[color], 'opacity=".6"'),
          "</pattern></defs>",
        ]
      : []),
    text(HEADER_LEFT, 24, title, palette.ink, 16, 'font-weight="600"'),
    ...stats.flatMap(({ label, value, unit, color }, index) => {
      const x = HEADER_LEFT + index * ((W - 2 * HEADER_LEFT) / stats.length);
      const unitLabel = unit
        ? `<tspan dx="4" fill="${palette.muted}" font-size="13" font-weight="500">${unit}</tspan>`
        : "";
      return [
        text(x, 53, label, palette.muted),
        `<text x="${x}" y="84" fill="${color ? palette[color] : palette.ink}" font-size="28" font-weight="650">${escapeXml(value)}${unitLabel}</text>`,
      ];
    }),
    text(44, 103, "mg", palette.muted, 11, 'text-anchor="end"'),
    ...Array.from({ length: 5 }, (_, index) => {
      const y = scale.y(index * scale.step);
      return (
        line(LEFT, y, RIGHT, y, palette.muted, index === 0 ? 'opacity=".4"' : 'opacity=".2"') +
        text(44, y + 4, decimal.format(index * scale.step), palette.muted, 11, 'text-anchor="end"')
      );
    }),
    ...draw(scale, palette),
    "</svg>",
  ].join("");
  return `![${alt.replace(/[[\]\r\n]/g, " ")}](data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}?raycast-width=${W}&raycast-height=${H})`;
}

function polyline(points: Point[]) {
  return points.map(({ x, y }) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
}

export function timelineBounds(now: Date, bedtime: Date) {
  const end = +bedtime + Math.min(2 * HOUR, Math.max(0, +now + 24 * HOUR - +bedtime));
  return { start: end - 24 * HOUR, end };
}

export function timelineMarkdown({
  intakes,
  now,
  bedtime,
  settings,
  appearance,
  simulation,
  lastCup,
}: {
  intakes: readonly CaffeineIntake[];
  now: Date;
  bedtime: Date;
  settings: Settings;
  appearance: Appearance;
  simulation?: CaffeineIntake;
  lastCup?: { cutoff: Date | undefined };
}) {
  const { start, end } = timelineBounds(now, bedtime);
  const baseline = (time: number) => calculateTotalResidualCaffeine(intakes, new Date(time), settings.halfLife);
  const projected = (time: number) =>
    simulation ? calculateResidualCaffeine(simulation, new Date(time), settings.halfLife) : 0;
  const inRange = (time: number) => time >= start && time <= end;
  const intakeTimes = [...new Set(intakes.map(({ timestamp }) => +timestamp).filter(inRange))];
  const momentTimes = [+now, +bedtime, ...intakeTimes, ...(simulation ? [+simulation.timestamp] : [])].filter(inRange);
  const sampleTimes = [
    ...new Set([
      ...Array.from({ length: (24 * 60) / 5 + 1 }, (_, index) => start + index * 5 * MINUTE),
      ...momentTimes,
    ]),
  ].sort((a, b) => a - b);
  const samples = sampleTimes.map((time) => {
    const logged = baseline(time);
    return { time, logged, combined: logged + projected(time) };
  });
  const x = (time: number) => LEFT + ((time - start) / (end - start)) * (RIGHT - LEFT);
  const limit = settings.maxCaffeineAtBedtime;
  const atBed = baseline(+bedtime);
  const projectedAtBed = atBed + projected(+bedtime);
  const stats = simulation
    ? [
        mgStat("Logged at bedtime", atBed),
        mgStat("With this drink", projectedAtBed, "forecast"),
        mgStat("Bedtime limit", limit),
      ]
    : [
        mgStat("Estimated now", baseline(+now)),
        mgStat("Estimated at bedtime", atBed, "accent"),
        mgStat("Bedtime limit", limit),
      ];

  if (lastCup) {
    const cutoff = lastCup.cutoff;
    stats.push({
      label: cutoff && cutoff < now ? "Last cup by · passed" : "Last cup by",
      value: cutoff ? formatClock(cutoff) : "No cutoff",
    });
  }

  return statsMarkdown({
    appearance,
    title: simulation ? "What-if forecast" : "24-hour caffeine timeline",
    description: `Estimated caffeine in milligrams. Bedtime is ${formatDateTime(bedtime)}.`,
    stats,
    max: samples.reduce((max, sample) => Math.max(max, sample.combined), limit),
    color: simulation ? "forecast" : "accent",
    draw: ({ y }, palette) => {
      const seriesColor = simulation ? palette.forecast : palette.accent;
      const curve = polyline(samples.map((sample) => ({ x: x(sample.time), y: y(sample.combined) })));
      const saved = simulation ? polyline(samples.map((sample) => ({ x: x(sample.time), y: y(sample.logged) }))) : "";
      const bedX = x(+bedtime);
      const nowVisible = inRange(+now);
      const legend = [
        {
          label: simulation ? "Logged" : "Logged drink",
          mark: simulation
            ? line(0, 0, 18, 0, palette.accent, `stroke-width="2" stroke-dasharray="${LOGGED_DASH}"`)
            : dot(9, 0, 3, palette.accent),
        },
        ...(simulation
          ? [
              {
                label: "With this drink",
                mark: line(0, 0, 18, 0, palette.forecast, 'stroke-width="2"') + diamond(9, 0, 3.5, palette.forecast),
              },
            ]
          : []),
        { label: "Bedtime limit", mark: line(0, 0, 18, 0, palette.threshold, `stroke-dasharray="${LIMIT_DASH}"`) },
        ...(nowVisible ? [{ label: "Now", mark: line(9, -6, 9, 6, palette.muted, 'opacity=".75"') }] : []),
      ];
      return [
        `<polygon points="${LEFT},${BOTTOM} ${curve} ${RIGHT},${BOTTOM}" fill="url(#dots)"/>`,
        line(LEFT, y(limit), RIGHT, y(limit), palette.threshold, `stroke-dasharray="${LIMIT_DASH}"`),
        line(bedX, TOP, bedX, BOTTOM, palette.muted, 'stroke-dasharray="2 4"'),
        text(bedX, 103, `Bedtime ${formatClock(bedtime)}`, palette.muted, 11, 'text-anchor="end"'),
        ...(nowVisible ? [line(x(+now), TOP, x(+now), BOTTOM, palette.muted, 'opacity=".75"')] : []),
        saved
          ? `<polyline points="${saved}" stroke="${palette.accent}" fill="none" stroke-width="2" stroke-dasharray="${LOGGED_DASH}"/>`
          : "",
        `<polyline points="${curve}" stroke="${seriesColor}" fill="none" stroke-width="2" stroke-linejoin="round"/>`,
        dot(bedX, y(projectedAtBed), 3.4, seriesColor),
        ...intakeTimes.map((time) => dot(x(time), BOTTOM, 3, palette.accent)),
        simulation && inRange(+simulation.timestamp)
          ? diamond(x(+simulation.timestamp), BOTTOM, 4.5, palette.forecast)
          : "",
        ...Array.from({ length: 7 }, (_, index) => {
          const time = start + index * 4 * HOUR;
          return text(x(time), 262, formatClock(new Date(time)), palette.muted, 11, 'text-anchor="middle"');
        }),
        ...legend.map(({ label, mark }, index) => {
          const keyX = LEFT + index * ((RIGHT - LEFT) / legend.length);
          return `<g transform="translate(${keyX} ${LEGEND_Y})">${mark}${text(24, 4, label, palette.muted, 12)}</g>`;
        }),
      ];
    },
  });
}

export function historyMarkdown(data: ReturnType<typeof historyStats>, appearance: Appearance) {
  const hourly = data.buckets.length === 24;
  const peak = data.buckets.reduce((highest, bucket) => (bucket.amount > highest.amount ? bucket : highest));
  const description = data.count
    ? `Logged caffeine by ${hourly ? "hour" : "day"} in milligrams. Highest total ${formatMg(peak.amount)} ${hourly ? "at" : "on"} ${peak.label}.`
    : "No drinks logged in this period.";

  return statsMarkdown({
    appearance,
    title: data.label,
    description,
    stats: [
      mgStat("Total logged", data.total, "accent"),
      mgStat("Daily average", data.dailyAverage),
      { label: "Drinks logged", value: data.count.toLocaleString() },
    ],
    max: peak.amount,
    draw: ({ y }, palette) => {
      const gap = (RIGHT - LEFT) / data.buckets.length;
      const width = Math.min(40, gap * 0.64);
      const every = hourly ? 4 : data.buckets.length > 7 ? 5 : 1;
      return [
        ...data.buckets.flatMap(({ label, amount }, index) => {
          const x = LEFT + (index + 0.5) * gap;
          const height = BOTTOM - y(amount);
          return [
            height > 0
              ? `<rect x="${x - width / 2}" y="${y(amount)}" width="${width}" height="${height}" rx="${Math.min(3, height / 2)}" fill="${palette.accent}"/>`
              : "",
            index % every === 0 || index === data.buckets.length - 1
              ? text(x, 262, label, palette.muted, 11, 'text-anchor="middle"')
              : "",
          ];
        }),
        ...(data.count === 0
          ? [text((LEFT + RIGHT) / 2, (TOP + BOTTOM) / 2 - 8, description, palette.muted, 13, 'text-anchor="middle"')]
          : []),
        text(LEFT, LEGEND_Y + 4, hourly ? "Local time" : "Local date", palette.muted, 12),
      ];
    },
  });
}

export function lastCupMarkdown(cutoff: Date | undefined, now: Date, drink: string, amount: number): string {
  if (!cutoff) return `**Last cup by** · No estimated cutoff for ${formatMg(amount)} of ${drink} at this threshold.`;
  return `**Last cup by** · ${formatDateTime(cutoff)}${cutoff < now ? " (passed)" : ""} for ${formatMg(amount)} of ${drink}.`;
}
