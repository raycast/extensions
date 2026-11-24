import { Colors, getThemeColor } from "@/common/colors";
import { Optional } from "@/common/utils/optional-utils";

const PULSABLE_SIZES = [32, 24];

export function pulseAnimation(svg: string): string {
  for (const match of svg.matchAll(/<path ([^>]*?)\s*\/>/g)) {
    const attrs = match[1];
    const width = getAttr(attrs, "width");
    const height = getAttr(attrs, "height");
    const size = PULSABLE_SIZES.find((candidate) => width === `${candidate}` && height === `${candidate}`);

    if (size !== undefined) {
      const x = parseFloat(getAttr(attrs, "x") ?? "0");
      const y = parseFloat(getAttr(attrs, "y") ?? "0");
      const fill = getAttr(attrs, "fill") ?? Colors.WHITE;
      const textColor = getThemeColor(fill);
      const half = size / 2;

      const borderedAvatar = `<path ${attrs} stroke="${textColor}" stroke-width="1" stroke-opacity="0.5" />`;

      return (
        svg.slice(0, match.index) +
        buildPulseRings(x + half, y + half, half, fill) +
        borderedAvatar +
        svg.slice(match.index + match[0].length)
      );
    }
  }

  return svg;
}

export function buildPulseRings(cx: number, cy: number, radius: number, fill: string): string {
  const textColor = getThemeColor(fill);

  const pulseRing =
    `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="${fill}" stroke-width="3">` +
    `<animate attributeName="r" values="${radius};${radius + 12}" dur="1.5s" repeatCount="indefinite" />` +
    `<animate attributeName="opacity" values="0.7;0" dur="1.5s" repeatCount="indefinite" />` +
    `</circle>`;

  const pulseRingBorder =
    `<circle cx="${cx}" cy="${cy}" r="${radius + 2}" fill="none" stroke="${textColor}" stroke-width="1">` +
    `<animate attributeName="r" values="${radius + 2};${radius + 14}" dur="1.5s" repeatCount="indefinite" />` +
    `<animate attributeName="opacity" values="0.5;0" dur="1.5s" repeatCount="indefinite" />` +
    `</circle>`;

  return pulseRing + pulseRingBorder;
}

function getAttr(attrs: string, name: string): Optional<string> {
  const match = attrs.match(new RegExp(`\\b${name}="([^"]*)"`));
  return match?.at(1);
}
