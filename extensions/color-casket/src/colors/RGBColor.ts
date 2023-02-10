import convert from "color-convert";

import Color from "./Color";
import { APPLE, RGB } from "color-convert/conversions";
import { HEXColor, HSLColor, KeywordColor } from "./index";
import { Keyboard } from "@raycast/api";

import { isValidRGB } from "../validators";
import { parseValues } from "../typeUtilities";

export default class RGBColor extends Color<RGB> {
  public type = "RGB";

  public static validator = isValidRGB;

  public static prepareValue = <RGB>(value: string): RGB => parseValues(value) as unknown as RGB;

  public readonly shortcut: Keyboard.Shortcut = { modifiers: ["cmd", "shift"], key: "r" };

  public get alternatives(): [RGBColor, HEXColor, HSLColor, KeywordColor] {
    return [
      this,
      new HEXColor(convert.rgb.hex(this.value)),
      new HSLColor(convert.rgb.hsl(this.value)),
      new KeywordColor(convert.rgb.keyword(this.value)),
    ];
  }

  public stringValue(): string {
    return `rgb(${this.value[0]}, ${this.value[1]}, ${this.value[2]})`;
  }
}
