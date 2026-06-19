import tinycolor from "tinycolor2";
import { setColor } from "../lib/nanoleaf-client";

type Input = {
  /**
   * The color to apply. Accepts CSS named colors ("red", "skyblue",
   * "deeppink"), hex codes with or without the leading hash ("#FF0000",
   * "ff0000"), and rgb/hsl strings ("rgb(255, 0, 0)", "hsl(0, 100%, 50%)").
   * Pick the most natural representation for the user's phrasing.
   */
  color: string;
};

export default async function tool(input: Input) {
  const parsed = tinycolor(input.color);
  if (!parsed.isValid()) {
    throw new Error(`Could not parse color "${input.color}".`);
  }
  const { h, s } = parsed.toHsv();
  await setColor(Math.round(h), Math.min(Math.max(Math.round(s * 100), 0), 100));
  return `Color set to ${parsed.toName() || parsed.toHexString()}.`;
}
