import { getPreferenceValues, Icon, Image, Keyboard, List } from "@raycast/api";
import { Color, DeprecatedColor, HistoryItem } from "./types";
import ColorJS from "colorjs.io";

const preferences: Preferences = getPreferenceValues();

export function getFormattedColor(
  _color: Color | DeprecatedColor,
  format?: "hex" | "hex-lower-case" | "hex-no-prefix" | "rgba" | "rgba-percentage" | "hsla" | "hsva",
) {
  const color =
    "colorSpace" in _color
      ? new ColorJS(_color.colorSpace, [_color.red, _color.green, _color.blue], _color.alpha)
      : new ColorJS("srgb", [_color.red / 255, _color.green / 255, _color.blue / 255], _color.alpha);

  switch (format || preferences.colorFormat) {
    case "hex": {
      return color.to("srgb").toString({ format: "hex" }).toUpperCase();
    }
    case "hex-lower-case": {
      return color.to("srgb").toString({ format: "hex" }).toLowerCase();
    }
    case "hex-no-prefix": {
      return color.to("srgb").toString({ format: "hex" }).replace("#", "");
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
  }
}

export function getHex(_color: Color | DeprecatedColor) {
  const color =
    "colorSpace" in _color
      ? new ColorJS(_color.colorSpace, [_color.red, _color.green, _color.blue], _color.alpha)
      : new ColorJS("srgb", [_color.red / 255, _color.green / 255, _color.blue / 255], _color.alpha);

  return color.toString({ format: "hex" }).toUpperCase();
}

export function getShortcut(index: number) {
  const key = index + 1;

  let shortcut: Keyboard.Shortcut | undefined;
  if (key >= 1 && key <= 9) {
    shortcut = { modifiers: ["cmd"], key: String(key) as Keyboard.KeyEquivalent };
  }

  return shortcut;
}

export function getIcon(color: string | Color | DeprecatedColor) {
  const hex = typeof color === "string" ? color : getHex(color);
  if (!hex) {
    return undefined;
  }

  const icon: Image.ImageLike = {
    source: Icon.CircleFilled,
    tintColor: { light: hex, dark: hex, adjustContrast: false },
  };

  return icon;
}

export function getAccessories(historyItem: HistoryItem) {
  const accessories = new Array<List.Item.Accessory>();
  accessories.push({ date: new Date(historyItem.date), tooltip: new Date(historyItem.date).toLocaleString() });
  return accessories;
}
