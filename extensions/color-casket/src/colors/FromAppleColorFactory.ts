import convert from "color-convert";

import { APPLE } from "color-convert/conversions";
import { ColorType } from "./Color";
import { HEXColor, RGBColor, HSLColor, KeywordColor } from "./index";

export default function fromAppleColorFactory(color: APPLE, type: ColorType) {
  switch (type) {
    case ColorType.HEX:
      return new HEXColor(convert.apple.hex(color));
    case ColorType.RGB:
      return new RGBColor(convert.apple.rgb(color));
    case ColorType.HSL:
      return new HSLColor(convert.apple.hsl(color));
    case ColorType.KEYWORD:
      return new KeywordColor(convert.apple.keyword(color));
  }
}
