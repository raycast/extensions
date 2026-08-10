import { formatCssHsl, formatCssRgb, formatCssVariable, formatHsl, formatJson, formatRgb } from "./color-format";
import type { TraditionalColor } from "./types";

export type CopyFormat = "hex" | "rgb" | "cssRgb" | "hsl" | "cssHsl" | "cssVariable" | "json";

export function getColorCopyValue(color: TraditionalColor, format: CopyFormat): string {
  switch (format) {
    case "rgb":
      return formatRgb(color);
    case "cssRgb":
      return formatCssRgb(color);
    case "hsl":
      return formatHsl(color);
    case "cssHsl":
      return formatCssHsl(color);
    case "cssVariable":
      return formatCssVariable(color);
    case "json":
      return formatJson(color);
    case "hex":
    default:
      return color.hex;
  }
}

export function getCopyFormatLabel(format: CopyFormat): string {
  switch (format) {
    case "rgb":
      return "RGB";
    case "cssRgb":
      return "CSS RGB";
    case "hsl":
      return "HSL";
    case "cssHsl":
      return "CSS HSL";
    case "cssVariable":
      return "CSS Variable";
    case "json":
      return "JSON";
    case "hex":
    default:
      return "HEX";
  }
}
