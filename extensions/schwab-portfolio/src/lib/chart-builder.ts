import { environment } from "@raycast/api";

export interface ChartOptions {
  prices: number[];
  labels?: string[];
  width?: number;
  height?: number;
  /** Overrides the Raycast appearance; used by the local preview harness. */
  theme?: "light" | "dark";
}

interface ChartTheme {
  up: string;
  down: string;
  tick: string;
  grid: string;
  baseline: string;
}

// Both pairs validated for lightness band, chroma, CVD separation, and >= 3:1
// contrast against their surface (the +/- sign carries direction as backup).
const THEMES: Record<"light" | "dark", ChartTheme> = {
  light: { up: "#1e9e5a", down: "#d94040", tick: "#73737a", grid: "rgba(0,0,0,0.08)", baseline: "rgba(0,0,0,0.30)" },
  dark: {
    up: "#26ad60",
    down: "#ea4f47",
    tick: "#98989d",
    grid: "rgba(255,255,255,0.10)",
    baseline: "rgba(255,255,255,0.30)",
  },
};

const FONT = `font-family="-apple-system, Helvetica, sans-serif" style="font-variant-numeric: tabular-nums"`;

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function coordinate(value: number): string {
  return Number(value.toFixed(2)).toString();
}

/** Round tick values to clean 1/2/2.5/5 × 10^n steps covering [min, max]. */
function niceTicks(min: number, max: number, targetCount = 4): number[] {
  const range = max - min;
  if (range <= 0) return [min];

  const roughStep = range / targetCount;
  const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
  const candidates = [1, 2, 2.5, 5, 10].map((multiplier) => multiplier * magnitude);
  const step = candidates.find((candidate) => candidate >= roughStep) ?? candidates[candidates.length - 1];

  const ticks: number[] = [];
  for (let tick = Math.ceil(min / step) * step; tick <= max + step * 0.001; tick += step) {
    ticks.push(Number(tick.toFixed(10)));
  }
  return ticks;
}

function formatTick(value: number, domainMax: number): string {
  if (Math.abs(domainMax) >= 100_000) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: "compact",
      maximumFractionDigits: 2,
    }).format(value);
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: Math.abs(domainMax) >= 1000 ? 0 : 2,
  }).format(value);
}

export function buildChartMarkdown(options: ChartOptions, altText: string): string {
  const { prices, labels, width = 860, height = 380 } = options;
  const theme = THEMES[options.theme ?? environment.appearance];

  if (prices.length < 2) return "*Chart data not available*";

  const minimumPrice = Math.min(...prices);
  const maximumPrice = Math.max(...prices);
  const range = maximumPrice - minimumPrice;
  const padding = range === 0 ? Math.abs(maximumPrice) * 0.01 || 1 : range * 0.06;
  const domainMinimum = minimumPrice - padding;
  const domainMaximum = maximumPrice + padding;
  const domainRange = domainMaximum - domainMinimum;

  const ticks = niceTicks(domainMinimum, domainMaximum);
  const tickTexts = ticks.map((tick) => formatTick(tick, domainMaximum));
  const longestTick = Math.max(...tickTexts.map((text) => text.length));

  const left = 10;
  const right = Math.max(56, Math.ceil(longestTick * 7.9) + 20);
  const top = 14;
  const bottom = 34;
  const plotRight = width - right;
  const plotBottom = height - bottom;
  const plotWidth = plotRight - left;
  const plotHeight = plotBottom - top;

  const xForIndex = (index: number) => left + (index / (prices.length - 1)) * plotWidth;
  const yForPrice = (price: number) => top + ((domainMaximum - price) / domainRange) * plotHeight;

  const isUp = prices[prices.length - 1] >= prices[0];
  const color = isUp ? theme.up : theme.down;
  const gradientId = `fill${color.slice(1)}`;

  const points = prices
    .map((price, index) => `${coordinate(xForIndex(index))},${coordinate(yForPrice(price))}`)
    .join(" ");
  const areaPoints = `${points} ${coordinate(plotRight)},${coordinate(plotBottom)} ${coordinate(left)},${coordinate(plotBottom)}`;

  // Solid hairline gridlines at clean tick values, label to the right of the plot.
  const gridAndTicks = ticks
    .map((tick, index) => {
      const y = coordinate(yForPrice(tick));
      return (
        `<line x1="${left}" y1="${y}" x2="${plotRight}" y2="${y}" stroke="${theme.grid}" stroke-width="1"/>` +
        `<text x="${plotRight + 10}" y="${y}" text-anchor="start" dominant-baseline="middle" font-size="13" fill="${theme.tick}" ${FONT}>${escapeXml(tickTexts[index])}</text>`
      );
    })
    .join("");

  // Dashed reference line at the period's starting price.
  const baselineY = coordinate(yForPrice(prices[0]));
  const baseline = `<line x1="${left}" y1="${baselineY}" x2="${plotRight}" y2="${baselineY}" stroke="${theme.baseline}" stroke-dasharray="3 4" stroke-width="1"/>`;

  let xLabels = "";
  if (labels?.length) {
    const count = Math.min(6, labels.length);
    const indices = Array.from({ length: count }, (_, index) =>
      count === 1 ? 0 : Math.round((index * (labels.length - 1)) / (count - 1)),
    );
    xLabels = indices
      .map((labelIndex, index) => {
        const anchor = index === 0 ? "start" : index === indices.length - 1 ? "end" : "middle";
        return `<text x="${coordinate(xForIndex(labelIndex))}" y="${height - 9}" text-anchor="${anchor}" font-size="13" fill="${theme.tick}" ${FONT}>${escapeXml(labels[labelIndex])}</text>`;
      })
      .join("");
  }

  const endX = coordinate(xForIndex(prices.length - 1));
  const endY = coordinate(yForPrice(prices[prices.length - 1]));
  const endDot =
    `<circle cx="${endX}" cy="${endY}" r="8" fill="${color}" fill-opacity="0.22"/>` +
    `<circle cx="${endX}" cy="${endY}" r="3.5" fill="${color}"/>`;

  // Label the period high and low directly on the chart (hover isn't possible
  // in Raycast's static markdown, so the extremes are annotated instead).
  let extremeLabels = "";
  if (range > 0) {
    const clampX = (x: number) => Math.min(Math.max(x, left + 36), plotRight - 36);
    const annotate = (index: number, price: number, above: boolean) => {
      const x = xForIndex(index);
      const y = yForPrice(price);
      return (
        `<circle cx="${coordinate(x)}" cy="${coordinate(y)}" r="2.5" fill="${color}"/>` +
        `<text x="${coordinate(clampX(x))}" y="${coordinate(above ? y - 9 : y + 18)}" text-anchor="middle" font-size="12" fill="${theme.tick}" ${FONT}>${escapeXml(formatTick(price, domainMaximum))}</text>`
      );
    };
    extremeLabels =
      annotate(prices.indexOf(maximumPrice), maximumPrice, true) +
      annotate(prices.indexOf(minimumPrice), minimumPrice, false);
  }

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    `<defs><linearGradient id="${gradientId}" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0%" stop-color="${color}" stop-opacity="0.22"/>` +
    `<stop offset="100%" stop-color="${color}" stop-opacity="0.02"/>` +
    `</linearGradient></defs>` +
    gridAndTicks +
    `<polygon points="${areaPoints}" fill="url(#${gradientId})" stroke="none"/>` +
    baseline +
    `<polyline points="${points}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>` +
    endDot +
    extremeLabels +
    xLabels +
    `</svg>`;

  // encodeURIComponent leaves ( ) unencoded; unescaped parens inside a markdown
  // image URL terminate the link early, so encode them explicitly.
  const dataUri = `data:image/svg+xml,${encodeURIComponent(svg).replaceAll("(", "%28").replaceAll(")", "%29")}`;
  return `![${altText}](${dataUri})`;
}
