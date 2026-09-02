import { getFormattedColor } from "../lib/utils";

type ColorFormat =
  | "hex"
  | "hex-lower-case"
  | "hex-no-prefix"
  | "rgb"
  | "rgb-percentage"
  | "rgba"
  | "rgba-percentage"
  | "hsla"
  | "hsva"
  | "oklch"
  | "lch"
  | "p3";

type Input = {
  /** A CSS color value, such as #FF6363, rgb(255 99 99), hsl(0 100% 69%), or rebeccapurple. */
  color: string;
  /** The color format to return. */
  format: ColorFormat;
};

/** Convert a valid CSS color value to another color format. */
export default function convertColor(input: Input) {
  try {
    return {
      input: input.color,
      format: input.format,
      color: getFormattedColor(input.color, input.format),
    };
  } catch {
    throw new Error(`"${input.color}" is not a valid color.`);
  }
}
