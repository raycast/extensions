import { environment } from "@raycast/api";
import { execa } from "execa";
import { chmodSync } from "fs";
import { join } from "path";
import { getTransformedTailwindConfig } from "./tailwind";

export type RGB = Record<"r" | "g" | "b", number>;

export async function pickColor() {
  // Launch the binary with the correct permissions
  const command = join(environment.assetsPath, "tailwind-picker");
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

  // FIXME: Improve algorithm precision
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
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return { r, g, b };
}

export function toHex(rgb: RGB) {
  const { r, g, b } = rgb;
  return `#${r.toString(16)}${g.toString(16)}${b.toString(16)}`;
}

export function toTailwind(color: RGB) {
  const tailwindColors = getTransformedTailwindConfig();
  const colors = Array.from(tailwindColors.keys());

  const nearest = nearestColor(color, colors);
  const tailwind = tailwindColors.get(nearest);

  if (!tailwind) throw new Error("Could not find tailwind color");

  return tailwind;
}
