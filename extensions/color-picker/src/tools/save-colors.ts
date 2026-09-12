import { Tool } from "@raycast/api";
import { addToHistory } from "../lib/history";
import { getFormattedColor, parseColorList } from "../lib/utils";

type Input = {
  /** One or more valid CSS color values separated by semicolons, for example "#FF6363; #66D3BB". */
  colors: string;
  favorite?: boolean;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const colors = normalizeColors(input.colors);
  const destination = input.favorite ? "favorites" : "history";
  return {
    message: `Add ${colors.length} ${colors.length === 1 ? "color" : "colors"} to Color Picker ${destination}?`,
    info: [{ name: "Colors", value: colors.join(", ") }],
  };
};

/** Save one or more colors to Color Picker history so they appear in Organize Colors and the menu bar. */
export default async function saveColors(input: Input) {
  const colors = normalizeColors(input.colors);
  const destination = input.favorite ? "favorites" : "history";

  colors.forEach((color) => addToHistory(color, input.favorite ? { isFavorite: true } : undefined));

  return {
    savedCount: colors.length,
    colors,
    favorite: Boolean(input.favorite),
    message: `Added ${colors.length} ${colors.length === 1 ? "color" : "colors"} to Color Picker ${destination}.`,
  };
}

function normalizeColors(colors: string) {
  return parseColorList(colors).map((color) => {
    try {
      return getFormattedColor(color, "hex");
    } catch {
      throw new Error(`"${color}" is not a valid color.`);
    }
  });
}
