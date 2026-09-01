import colorNamer from "color-namer";
import { getColorByProximity, getFormattedColor } from "../lib/utils";

type Input = {
  /** A CSS color value, such as #663399, rgb(102 51 153), or rebeccapurple. */
  color: string;
  /** Number of nearest color names to return. Defaults to 5 and must be between 1 and 10. */
  limit?: number;
};

/** Find the closest human-readable names for a color across the supported color-name palettes. */
export default function nameColor(input: Input) {
  const limit = Math.min(Math.max(Math.trunc(input.limit ?? 5), 1), 10);

  try {
    const hex = getFormattedColor(input.color, "hex");
    const names = getColorByProximity(colorNamer(hex)).slice(0, limit);

    return {
      color: hex,
      names: names.map((match) => ({
        name: match.name,
        hex: match.hex.toUpperCase(),
        distance: match.distance,
      })),
    };
  } catch {
    throw new Error(`"${input.color}" is not a valid color.`);
  }
}
