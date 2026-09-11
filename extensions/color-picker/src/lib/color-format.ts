import ColorJS from "colorjs.io";
import type { ColorFormatType, HistoryColor } from "./types";

export function formatColor(_color: HistoryColor, format?: ColorFormatType) {
  let color;
  if (typeof _color === "string") {
    color = new ColorJS(_color);
  } else if ("colorSpace" in _color) {
    color = new ColorJS(_color.colorSpace, [_color.red, _color.green, _color.blue], _color.alpha);
  } else {
    color = new ColorJS("srgb", [_color.red / 255, _color.green / 255, _color.blue / 255], _color.alpha);
  }

  switch (format) {
    default:
    case "hex": {
      return color.to("srgb").toString({ format: "hex" }).toUpperCase();
    }
    case "hex-lower-case": {
      return color.to("srgb").toString({ format: "hex" }).toLowerCase();
    }
    case "hex-no-prefix": {
      return color.to("srgb").toString({ format: "hex" }).replace("#", "");
    }
    case "rgb": {
      return color.to("srgb").toString({ format: "rgb_number" });
    }
    case "rgb-percentage": {
      return color.to("srgb").toString({ format: "rgb" });
    }
    case "rgba": {
      return color.to("srgb").toString({ format: "rgba_number" });
    }
    case "rgba-percentage": {
      return color.to("srgb").toString({ format: "rgba" });
    }
    case "hsla": {
      return color.to("hsl").toString({ format: "hsla" });
    }
    case "hsva": {
      return color.to("hsv").toString({ format: "color" });
    }
    case "oklch": {
      return color.to("oklch").toString();
    }
    case "lch": {
      const lchColor = color.to("lch");
      const [l, c, h] = lchColor.coords;
      return `lch(${l.toFixed(2)}% ${c} ${h})`;
    }
    case "p3": {
      return color.to("p3").toString({ format: "p3" });
    }
  }
}
