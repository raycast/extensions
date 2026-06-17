import convert from "color-convert";

import { HSL } from "color-convert/conversions";
import Color from "./Color";
import { HEXColor, RGBColor, KeywordColor } from "./index";
import { isValidHSL } from "../validators";
import { Keyboard } from "@raycast/api";

import { parseValues } from "../typeUtilities";

export default class HSLColor extends Color<HSL> {
  public type = "HSL";

  public static validator = isValidHSL;

  public static prepareValue = <HSL>(value: string): HSL => parseValues(value) as unknown as HSL;

  public readonly shortcut: Keyboard.Shortcut = { modifiers: ["cmd", "shift"], key: "h" };

  public get alternatives(): [HSLColor, HEXColor, RGBColor, KeywordColor] {
    return [
      this,
      new HEXColor(convert.hsl.hex(this.value)),
      new RGBColor(convert.hsl.rgb(this.value)),
      new KeywordColor(convert.hsl.keyword(this.value)),
    ];
  }

  public stringValue(): string {
    return `hsl(${this.value[0]}, ${this.value[1]}%, ${this.value[2]}${this.value[2] !== 0 ? "%" : ""})`;
  }
}
