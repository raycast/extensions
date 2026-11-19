export type ChartAppearance = "light" | "dark";

/** A colour of the chart for each appearance, as hex: an SVG can't use Raycast's colour names. */
export interface ChartColor {
  light: string;
  dark: string;
}

export interface ChartSlice {
  key: string;
  /** Positive. */
  amount: number;
  color: ChartColor;
}

/**
 * The colours of a chart's slices, in the order they're given out: the largest slice gets the first one. Neighbours
 * stay apart for colour-blind readers too, in both appearances, and so do the last and the first, which touch when
 * there's no "Other" slice between them.
 */
export const sliceColors: ChartColor[] = [
  { light: "#2a78d6", dark: "#3987e5" }, // Blue
  { light: "#eb6834", dark: "#d95926" }, // Orange
  { light: "#1baf7a", dark: "#199e70" }, // Aqua
  { light: "#eda100", dark: "#c98500" }, // Yellow
  { light: "#e87ba4", dark: "#d55181" }, // Magenta
  { light: "#008300", dark: "#008300" }, // Green
  { light: "#e34948", dark: "#e66767" }, // Red
];

/** The colour of the "Other" slice, which stands for every slice without a colour of its own. */
export const otherSliceColor: ChartColor = { light: "#aeaeb2", dark: "#636366" };

const ink = {
  light: { primary: "#1d1d1f", secondary: "#6e6e73", track: "#000000", trackOpacity: 0.1 },
  dark: { primary: "#f5f5f7", secondary: "#a1a1a6", track: "#ffffff", trackOpacity: 0.15 },
};

const WIDTH = 400;
const HEIGHT = 200;
const CENTER_X = WIDTH / 2;
const CENTER_Y = HEIGHT / 2;
/** To the middle of the ring. */
const RADIUS = 74;
const THICKNESS = 20;
/** How much thicker the emphasised slice is. */
const EMPHASIS = 8;
/** The space between two slices, along the middle of the ring. */
const GAP = 2;
const FONT = "-apple-system, 'SF Pro Text', 'Segoe UI', sans-serif";
const VALUE_FONT_SIZE = 20;
/** The width of a character of the value, as a share of its font size: about right for digits and spaces. */
const CHARACTER_WIDTH = 0.6;

function escapeXml(text: string) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

/** The point of the ring at `angle`: radians, clockwise from the top. */
function getPoint(angle: number) {
  return `${round(CENTER_X + RADIUS * Math.sin(angle))} ${round(CENTER_Y - RADIUS * Math.cos(angle))}`;
}

function ring(color: string, thickness: number, opacity = 1) {
  const stroke = `stroke="${color}" stroke-width="${thickness}"${opacity < 1 ? ` stroke-opacity="${opacity}"` : ""}`;
  return `<circle cx="${CENTER_X}" cy="${CENTER_Y}" r="${RADIUS}" fill="none" ${stroke}/>`;
}

/**
 * A donut chart as a data URI, for an image in markdown: Raycast has no chart component. Slices are drawn in the
 * order given, clockwise from the top, with `label` over `value` in the middle, e.g. "Spent" over "24 310 ₴".
 * Without slices that have an amount, the ring is empty. `emphasised` is the key of a slice to draw thicker.
 */
export function getDonutImage(
  slices: ChartSlice[],
  options: { label: string; value: string; appearance: ChartAppearance; emphasised?: string },
): string {
  const { label, value, appearance, emphasised } = options;
  const colors = ink[appearance];
  const visible = slices.filter((slice) => slice.amount > 0);
  const total = visible.reduce((sum, slice) => sum + slice.amount, 0);
  const getThickness = (slice: ChartSlice) => (slice.key === emphasised ? THICKNESS + EMPHASIS : THICKNESS);

  const marks: string[] = [];
  if (!visible.length) {
    marks.push(ring(colors.track, THICKNESS, colors.trackOpacity));
  } else if (visible.length === 1) {
    // An arc can't be a full circle: its start and end would be the same point.
    marks.push(ring(visible[0].color[appearance], getThickness(visible[0])));
  } else {
    const gap = GAP / RADIUS;
    let start = 0;
    for (const slice of visible) {
      const end = start + (slice.amount / total) * Math.PI * 2;
      // A slice too thin for the gaps keeps its whole arc, so it's still there.
      const inset = end - start > gap * 2 ? gap / 2 : 0;
      const from = start + inset;
      const to = end - inset;
      marks.push(
        `<path d="M ${getPoint(from)} A ${RADIUS} ${RADIUS} 0 ${to - from > Math.PI ? 1 : 0} 1 ${getPoint(to)}" ` +
          `fill="none" stroke="${slice.color[appearance]}" stroke-width="${getThickness(slice)}"/>`,
      );
      start = end;
    }
  }

  // The value shrinks to fit inside the ring, e.g. "≈ 1 234 567 ₴".
  const space = (RADIUS - (THICKNESS + EMPHASIS) / 2) * 2 - 12;
  const valueSize = Math.min(VALUE_FONT_SIZE, Math.floor(space / (Math.max(value.length, 1) * CHARACTER_WIDTH)));
  const text = (y: number, size: number, color: string, weight: number, content: string) =>
    `<text x="${CENTER_X}" y="${y}" text-anchor="middle" font-family="${FONT}" font-size="${size}" ` +
    `font-weight="${weight}" fill="${color}">${escapeXml(content)}</text>`;
  if (value) {
    marks.push(text(CENTER_Y - 8, 12, colors.secondary, 400, label));
    marks.push(text(CENTER_Y + 16, valueSize, colors.primary, 600, value));
  } else {
    marks.push(text(CENTER_Y + 4, 12, colors.secondary, 400, label));
  }

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">` +
    `${marks.join("")}</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}
