import type { Image } from "@raycast/api";

// Claude's signature orange, used for the progress fill.
const CLAUDE_ORANGE = "#D97757";

// Neutral track behind the fill.
const TRACK_GREY = "#444";

// Warning color when utilization is high.
const WARN_RED = "#D97757";

const WARN_AT = 95;

/** Point on the circle at `angle` degrees, measured clockwise from 12 o'clock. */
function polarToCartesian(radius: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;
  return {
    x: (50 + radius * Math.cos(angleInRadians)).toFixed(2),
    y: (50 + radius * Math.sin(angleInRadians)).toFixed(2),
  };
}

/**
 * Full disc, as a path rather than a `<circle>`.
 *
 * Raycast's SVG renderer draws `<path>` but ignores `<circle>` — a track drawn
 * as a circle came out invisible, and a 100% icon (two circles, no path) came
 * out completely blank. Two half arcs give the same shape via a path.
 */
function describeDisc(radius: number): string {
  const top = 50 - radius;
  const bottom = 50 + radius;
  return `M 50 ${top} A ${radius} ${radius} 0 1 1 50 ${bottom} A ${radius} ${radius} 0 1 1 50 ${top} Z`;
}

/** Filled wedge from the center, sweeping clockwise from 12 o'clock. */
function describeWedge(radius: number, sweepInDegrees: number): string {
  const start = polarToCartesian(radius, 0);
  const end = polarToCartesian(radius, sweepInDegrees);
  const largeArcFlag = sweepInDegrees > 180 ? "1" : "0";
  return `M 50 50 L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y} Z`;
}

function fillColor(percent: number): string {
  if (percent >= WARN_AT) return WARN_RED;
  return CLAUDE_ORANGE;
}

function progressFor(percent: number): number {
  return Math.min(Math.max(percent / 100, 0), 1);
}

/**
 * A grey disc that fills clockwise with an orange pie slice as usage climbs.
 *
 * Returns a `data:image/svg+xml,...` URI that Raycast can use as an icon.
 * We percent-encode the payload because a hex color's `#` would open a URL
 * fragment in a raw data URI, truncating the SVG mid-attribute.
 */
export function pieIcon(percent: number): Image.ImageLike {
  const progress = progressFor(percent);
  const color = fillColor(percent);
  const radius = 46;

  // A 360° sweep is degenerate — start and end land on the same point, drawing
  // nothing — so a full slice is just the whole disc.
  const slice =
    progress >= 1
      ? `<path d="${describeDisc(radius)}" fill="${color}" />`
      : progress > 0
        ? `<path d="${describeWedge(radius, progress * 360)}" fill="${color}" />`
        : "";

  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">`,
    `<path d="${describeDisc(radius)}" fill="${TRACK_GREY}" />`,
    slice,
    `</svg>`,
  ].join("");

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
