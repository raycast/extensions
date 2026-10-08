import convert from "color-convert";
import { HEX } from "color-convert/conversions";
import Color from "./Color";
import { isValidHEX } from "../validators";
import { RGBColor, HSLColor, KeywordColor } from "./index";
import { Keyboard } from "@raycast/api";

export default class HEXColor extends Color<HEX> {
  public type = "HEX";

  public static validator = isValidHEX;

  public static prepareValue = <HEX>(value: string): HEX => convert.rgb.hex(convert.hex.rgb(value)) as unknown as HEX;

  public readonly shortcut: Keyboard.Shortcut = { modifiers: ["cmd", "shift"], key: "x" };

  public get alternatives(): [HEXColor, RGBColor, HSLColor, KeywordColor] {
    return [
      this,
      new RGBColor(convert.hex.rgb(this.value)),
      new HSLColor(convert.hex.hsl(this.value)),
      new KeywordColor(convert.hex.keyword(this.value)),
    ];
  }

  public stringValue(): string {
    return `#${this.value}`;
  }
}
