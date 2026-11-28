import { converter, formatHex, formatHex8, formatHsl, formatRgb, parse } from "culori";

const toOklch = converter("oklch");
const round = (n = 0, digits = 2) => +n.toFixed(digits);

export function colorFormats(value: string) {
  const color = parse(value);
  if (!color) return undefined;
  const alpha = color.alpha ?? 1;
  const { l, c, h } = toOklch(color);
  return {
    hex: alpha < 1 ? formatHex8(color) : formatHex(color),
    rgb: formatRgb(color),
    hsl: formatHsl(color),
    oklch: `oklch(${round(l * 100)}% ${round(c, 4)} ${round(h)}${alpha < 1 ? ` / ${round(alpha)}` : ""})`,
  };
}
