import { getPreferenceValues, Icon, Image, Keyboard, List } from "@raycast/api";
import { Colors, Palette } from "color-namer";
import ColorJS from "colorjs.io";
import uniqBy from "lodash/uniqBy";
import { ColorFormatType, CopyColorsFormat, HistoryColor, HistoryItem } from "./types";

const preferences = getPreferenceValues<ExtensionPreferences>();

export function getFormattedColor(_color: HistoryColor, format?: ColorFormatType) {
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

export function normalizeColorHex(colorInput: string) {
  let hex = colorInput.replace(/^#/, "");
  const validHexPattern = /^([a-f\d]{3,4}|[a-f\d]{6}|[a-f]\d{8})$/i;
  if (validHexPattern.test(hex)) {
    switch (hex.length) {
      case 3:
      case 4:
        hex = hex
          .slice(0, 3)
          .split("")
          .map((x) => x.repeat(2))
          .join("");
        break;
      case 8:
        hex = hex.slice(0, 6);
        break;
    }
  }
  return "#" + hex.toUpperCase();
}

export function getColorByPlatform(normalizedSearchString: string, colors?: Colors<Palette>) {
  return Object.entries(colors ?? {}).sort(([, a], [, b]) => {
    if (normalizeColorHex(a[0].hex) === normalizeColorHex(b[0].hex)) return 0;
    if (normalizedSearchString === normalizeColorHex(a[0].hex)) return -1;
    return 1;
  });
}

export function getColorByProximity(colors?: Colors<Palette>) {
  return uniqBy(Object.values(colors ?? {}).flat(), (x) => x.name.toLowerCase()).sort(
    (a, b) => a.distance - b.distance,
  );
}

export const COPY_FORMATS: Array<{
  format: CopyColorsFormat;
  title: string;
  icon: Icon;
}> = [
  { format: "json", title: "Copy Colors as JSON", icon: Icon.CodeBlock },
  { format: "css-classes", title: "Copy Colors as CSS Classes", icon: Icon.Brush },
  { format: "css-variables", title: "Copy Colors as CSS Variables", icon: Icon.Gear },
];

export function getColor(item: HistoryItem | string): HistoryColor {
  return typeof item === "string" ? item : item.color;
}

export function copyAsJSON(selectedColorItems: (HistoryItem | string)[]): string {
  return JSON.stringify(
    {
      colors: selectedColorItems.map((item) => getFormattedColor(getColor(item))),
    },
    null,
    2,
  );
}

export function copyAsCSSClasses(selectedColorItems: (HistoryItem | string)[]): string {
  const lines: string[] = [];

  selectedColorItems.forEach((item, index) => {
    const color = getFormattedColor(getColor(item));
    lines.push(`.color-${index + 1} {`, `  color: ${color};`, "}", "");
  });

  return lines.join("\n").trim();
}

export function copyAsCSSVariables(selectedColorItems: (HistoryItem | string)[]): string {
  const lines: string[] = [":root {"];

  selectedColorItems.forEach((item, index) => {
    const color = getFormattedColor(getColor(item));
    lines.push(`  --color-${index + 1}: ${color};`);
  });

  lines.push("}");

  return lines.join("\n");
}

export function copySelectedColors(selectedColorItems: (HistoryItem | string)[], format: CopyColorsFormat): string {
  switch (format) {
    case "json":
      return copyAsJSON(selectedColorItems);
    case "css-classes":
      return copyAsCSSClasses(selectedColorItems);
    case "css-variables":
      return copyAsCSSVariables(selectedColorItems);
    default:
      throw new Error(`Unsupported copy format: ${format}`);
  }
}
