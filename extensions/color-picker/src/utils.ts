import { getPreferenceValues, Icon, Image, Keyboard, List } from "@raycast/api";
import ColorJS from "colorjs.io";
import { HistoryColor, HistoryItem } from "./types";

const preferences: Preferences = getPreferenceValues();

export function getFormattedColor(
  _color: HistoryColor,
  format?:
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
    | "p3",
) {
  let color;
  if (typeof _color === "string") {
    color = new ColorJS(_color);
  } else if ("colorSpace" in _color) {
    color = new ColorJS(_color.colorSpace, [_color.red, _color.green, _color.blue], _color.alpha);
  } else {
    color = new ColorJS("srgb", [_color.red / 255, _color.green / 255, _color.blue / 255], _color.alpha);
  }

  switch (format || preferences.colorFormat) {
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
      const oklchColor = color.to("oklch");
      const [l, c, h] = oklchColor.coords;
      const lPercentage = (l * 100).toFixed(2);
      return `oklch(${lPercentage}% ${c} ${h})`;
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

const unsupportedPreviewFormats = ["p3", "rgb", "rgb-percentage"];
export function getPreviewColor(color: HistoryColor) {
  const formattedColor = getFormattedColor(
    color,
    unsupportedPreviewFormats.includes(preferences.colorFormat) ? "oklch" : undefined,
  );
  return formattedColor;
}

export function getShortcut(index: number) {
  const key = index + 1;

  let shortcut: Keyboard.Shortcut | undefined;
  if (key >= 1 && key <= 9) {
    shortcut = { modifiers: ["cmd"], key: String(key) as Keyboard.KeyEquivalent };
  }

  return shortcut;
}

export function getIcon(color: HistoryColor) {
  const previewColor = typeof color === "string" ? color : getFormattedColor(color, "hex");
  if (!previewColor) {
    return undefined;
  }

  const icon: Image.ImageLike = {
    source: Icon.CircleFilled,
    tintColor: { light: previewColor, dark: previewColor, adjustContrast: false },
  };

  return icon;
}

export function getAccessories(historyItem: HistoryItem) {
  const accessories = new Array<List.Item.Accessory>();
  accessories.push({ date: new Date(historyItem.date), tooltip: new Date(historyItem.date).toLocaleString() });
  return accessories;
}
