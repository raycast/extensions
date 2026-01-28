import { AvailableColor, InvalidColor } from "./colors/Color";
import { HEXColor, HSLColor, KeywordColor, RGBColor } from "./colors";

export type AvailableTypes = [HEXColor, RGBColor, HSLColor, KeywordColor];

export function createColor(color: string) {
  const availableTypes = [HEXColor, RGBColor, HSLColor, KeywordColor];
  const type = availableTypes.find((type) => type.validator(color));

  if (typeof type === "undefined") {
    throw new InvalidColor("Invalid color");
  }

  return new type(type.prepareValue(color));
}

export function createTypes(color: string): AvailableColor[] {
  return createColor(color).alternatives;
}

export function parseValues(colorString: string) {
  return colorString
    .slice(colorString.indexOf("(") + 1, colorString.indexOf(")"))
    .split(",")
    .map((value) => parseInt(value))
    .slice(0, 3);
}
