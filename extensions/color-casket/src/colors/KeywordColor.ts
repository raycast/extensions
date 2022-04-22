import convert from "color-convert";

import { KEYWORD } from "color-convert/conversions";
import Color from "./Color";
import { HEXColor, RGBColor, HSLColor } from "./index";
import { Shortcut } from "@raycast/api/types/api/app/keyboard";

import { isValidColorName } from "../validators";

export default class KeywordColor extends Color<KEYWORD> {
  public static validator = isValidColorName;

  public static prepareValue = <KEYWORD>(value: string): KEYWORD => value as unknown as KEYWORD;

  public readonly shortcut: Shortcut = { modifiers: ["cmd", "shift"], key: "k" };

  public get alternatives(): [KeywordColor, HEXColor, RGBColor, HSLColor] {
    return [
      this,
      new HEXColor(convert.keyword.hex(this.value)),
      new RGBColor(convert.keyword.rgb(this.value)),
      new HSLColor(convert.keyword.hsl(this.value)),
    ];
  }

  public stringValue(): string {
    return this.value;
  }
}
