import { CopyColorsFormat } from "../lib/types";
import { copySelectedColors, parseColorList } from "../lib/utils";

type Input = {
  colors: string;
  format: CopyColorsFormat;
};

export default function formatPalette(input: Input) {
  try {
    const colors = parseColorList(input.colors);
    return { format: input.format, colors, output: copySelectedColors(colors, input.format) };
  } catch {
    throw new Error("Provide valid CSS colors separated by semicolons.");
  }
}
