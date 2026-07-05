import { Colors, toRgba } from "@/common/colors";

/**
 * Satori's CSS `repeating-linear-gradient()` support produces gradient stop
 * offsets that some SVG renderers don't clamp per spec (vercel/satori#554,
 * vercel/satori#594), so the weekend hatch used to render as a solid block
 * instead of a stripe pattern. This marker color identifies the placeholder
 * rect satori renders so it can be swapped for a hand-rolled SVG <pattern>
 * that only uses a plain <rect>, sidestepping satori's gradient conversion.
 */
export const WEEKEND_STRIPE_MARKER = "#FF00FF";

const PATTERN_ID = "weekend-stripe-pattern";

const PATTERN_DEFS =
  `<defs><pattern id="${PATTERN_ID}" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">` +
  `<rect width="6" height="1" fill="${toRgba(Colors.DIM, 0.5)}" /></pattern></defs>`;

export function weekendStripePattern(svg: string): string {
  if (!svg.includes(WEEKEND_STRIPE_MARKER)) return svg;

  const svgWithDefs = svg.replace(/(<svg[^>]*>)/, `$1${PATTERN_DEFS}`);
  return svgWithDefs.replaceAll(`fill="${WEEKEND_STRIPE_MARKER}"`, `fill="url(#${PATTERN_ID})"`);
}
