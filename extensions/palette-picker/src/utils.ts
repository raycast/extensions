import { environment } from "@raycast/api";
import { execa } from "execa";
import { chmodSync } from "fs";
import { join } from "path";

export type RGB = Record<"r" | "g" | "b", number>;
export type HSL = Record<"h" | "s" | "l", number>;

export async function pickColor() {
  // Launch the binary with the correct permissions
  const command = join(environment.assetsPath, "color-picker");
  chmodSync(command, 0o755);

  try {
    // Parse the output from the binary
    const { stdout } = await execa(command);
    return JSON.parse(stdout) as RGB;
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "stdout" in error &&
      error.stdout === "No color selected"
    )
      return undefined;
    else throw error;
  }
}

/**
 * Naive implementation of finding the nearest color in a list of rgb-colors
 */
export function nearestColor(color: RGB, colors: RGB[]) {
  let minDistance = Infinity;
  let nearestColor = colors[0];
  if (!nearestColor) throw new Error("No colors provided");

  for (const c of colors) {
    const r = c.r - color.r;
    const g = c.g - color.g;
    const b = c.b - color.b;
    const distance = r * r + g * g + b * b;

    if (distance < minDistance) {
      minDistance = distance;
      nearestColor = c;
    }
  }

  return nearestColor;
}

export function toRgb(hex: string): RGB {
  if (hex[0] === "#") hex = hex.slice(1);
  if (hex === "000") return { r: 0, g: 0, b: 0 };
  if (hex === "fff") return { r: 255, g: 255, b: 255 };

  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return { r, g, b };
}

export function toHex(rgb: RGB) {
  const { r, g, b } = rgb;
  const [intR, intG, intB] = [r, g, b].map((c) => Math.round(c));
  return `#${intR.toString(16)}${intG.toString(16)}${intB.toString(16)}`;
}

export function parseHslString(string: string): HSL {
  const [h, s, l] = string
    .replace("hsl(", "")
    .replace(")", "")
    .split(",")
    .map((s) =>
      s.includes("%") ? parseFloat(s.trim()) / 100 : parseFloat(s.trim())
    );

  if (h === undefined || s === undefined || l === undefined)
    throw new Error("Invalid HSL string");

  return { h, s, l };
}

export function fromHsl(hsl: HSL): RGB {
  const { h, s, l } = hsl;

  const fn = (n: number) => {
    const k = (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };

  return { r: fn(0) * 255, g: fn(8) * 255, b: fn(4) * 255 };
}
