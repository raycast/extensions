import { Colors } from "@/common/colors";
import { Optional } from "@/common/utils/optional-utils";

export function pulseAnimation(svg: string): string {
  for (const match of svg.matchAll(/<path ([^>]*?)\s*\/>/g)) {
    const attrs = match[1];

    if (getAttr(attrs, "width") === "32" && getAttr(attrs, "height") === "32") {
      const x = parseFloat(getAttr(attrs, "x") ?? "0");
      const y = parseFloat(getAttr(attrs, "y") ?? "0");
      const fill = getAttr(attrs, "fill") ?? Colors.WHITE;
      const cx = x + 16;
      const cy = y + 16;

      const pulseRing =
        `<circle cx="${cx}" cy="${cy}" r="16" fill="none" stroke="${fill}" stroke-width="3">` +
        `<animate attributeName="r" values="16;28" dur="1.5s" repeatCount="indefinite" />` +
        `<animate attributeName="opacity" values="0.7;0" dur="1.5s" repeatCount="indefinite" />` +
        `</circle>`;

      return svg.slice(0, match.index) + pulseRing + match[0] + svg.slice(match.index + match[0].length);
    }
  }

  return svg;
}

function getAttr(attrs: string, name: string): Optional<string> {
  const match = attrs.match(new RegExp(`\\b${name}="([^"]*)"`));
  return match?.at(1);
}
