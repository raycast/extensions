import { Colors, toRgba } from "@/common/colors";

const PATTERN_ID = "weekend-stripe-pattern";

const PATTERN_DEFS =
  `<defs><pattern id="${PATTERN_ID}" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">` +
  `<rect width="5" height="1" fill="${toRgba(Colors.DIM, 0.5)}" /></pattern></defs>`;

export function weekendStripePattern(svg: string): string {
  if (!svg.includes(Colors.STRIPE_MARKER)) return svg;

  const svgWithDefs = svg.replace(/(<svg[^>]*>)/, `$1${PATTERN_DEFS}`);
  return svgWithDefs.replaceAll(`fill="${Colors.STRIPE_MARKER}"`, `fill="url(#${PATTERN_ID})"`);
}
