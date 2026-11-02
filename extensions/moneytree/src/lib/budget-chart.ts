const yen = new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY" });

export type BudgetChartInput = {
  limit: number;
  spent?: number;
  average?: number;
  lastMonth?: number;
  day: number;
  daysInMonth: number;
  periodLabel: string;
  appearance: "light" | "dark";
};

const WIDTH = 440;
const PAD = 20;
const BAR = WIDTH - PAD * 2;

function escape(value: string): string {
  return value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

const green = "#3DBE7A";
const amber = "#F2A93B";
const red = "#FF5A5A";

// Green until half the budget, amber at 75%, red at 100%.
const stops: [number, string][] = [
  [0, green],
  [0.5, green],
  [0.75, amber],
  [1, red],
];

/** Colour on the green→amber→red budget scale for a spent/limit ratio; shared by bars and list rings. */
export function budgetProgressColor(ratio: number): string {
  const r = Math.min(1, Math.max(0, ratio));
  const upper = stops.findIndex(([offset]) => offset >= r);
  if (upper <= 0) return stops[0][1];
  const [o1, c1] = stops[upper - 1];
  const [o2, c2] = stops[upper];
  const t = (r - o1) / (o2 - o1);
  const channel = (hex: string, i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
  return `#${[0, 1, 2]
    .map((i) =>
      Math.round(channel(c1, i) + (channel(c2, i) - channel(c1, i)) * t)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

/** Renders the budget summary as an SVG so the detail pane reads as a visual, not a table. */
export function renderBudgetChart(input: BudgetChartInput): string {
  const dark = input.appearance === "dark";
  const text = dark ? "#FFFFFF" : "#1A1A1A";
  const muted = dark ? "#9A9A9A" : "#6E6E6E";
  const track = dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)";
  const font = `font-family="-apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif"`;
  const colorFor = budgetProgressColor;

  const remaining = input.spent === undefined ? undefined : input.limit - input.spent;
  const status =
    remaining === undefined
      ? "Spending unavailable"
      : remaining < 0
        ? `${yen.format(-remaining)} over budget`
        : remaining === 0
          ? "Budget reached"
          : `${yen.format(remaining)} left`;
  const statusColor = remaining !== undefined && remaining < 0 ? red : text;

  // Amounts first, then the percentage, matching the list's spent / budget · % standard.
  function bar(y: number, label: string, value: number | undefined, height: number): string {
    const ratio = value === undefined ? 0 : value / input.limit;
    const fill = Math.min(1, ratio) * BAR;
    const color = colorFor(ratio);
    const amounts =
      value === undefined ? "Unavailable" : `${yen.format(Math.round(value))} / ${yen.format(input.limit)}`;
    const percent = value === undefined ? "" : `${Math.round(ratio * 100)}%`;
    return `
      <text x="${PAD}" y="${y}" font-size="13" fill="${muted}" ${font}>${escape(label)}</text>
      <text x="${WIDTH - PAD}" y="${y}" font-size="13" text-anchor="end" ${font}><tspan fill="${text}">${escape(amounts)}</tspan>${percent ? `<tspan fill="${color}" font-weight="600" dx="8">${percent}</tspan>` : ""}</text>
      <rect x="${PAD}" y="${y + 10}" width="${BAR}" height="${height}" rx="${height / 2}" fill="${track}"/>
      ${fill > 0 ? `<rect x="${PAD}" y="${y + 10}" width="${Math.max(fill, height)}" height="${height}" rx="${height / 2}" fill="${color}"/>` : ""}`;
  }

  const footer = input.lastMonth === undefined ? "" : `Last month ${yen.format(input.lastMonth)}`;
  const height = input.lastMonth === undefined ? 196 : 222;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${height}" viewBox="0 0 ${WIDTH} ${height}">
    <text x="${PAD}" y="44" font-size="28" font-weight="700" fill="${statusColor}" ${font}>${escape(status)}</text>
    <text x="${PAD}" y="66" font-size="12" fill="${muted}" ${font}>${escape(input.periodLabel)} · Day ${input.day} of ${input.daysInMonth}</text>
    ${bar(104, "This month", input.spent, 8)}
    ${bar(166, "12-month average", input.average, 8)}
    ${footer ? `<text x="${PAD}" y="210" font-size="12" fill="${muted}" ${font}>${escape(footer)}</text>` : ""}
  </svg>`;
}

export function budgetChartMarkdown(input: BudgetChartInput): string {
  return `![Budget summary](data:image/svg+xml;base64,${Buffer.from(renderBudgetChart(input)).toString("base64")})`;
}
