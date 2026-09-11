import { getPreferenceValues, Icon, Image, Keyboard, List } from "@raycast/api";
import { Colors, Palette } from "color-namer";
import { formatColor } from "./color-format";
import uniqBy from "lodash/uniqBy";
import { CopyColorsFormat, HistoryColor, HistoryItem } from "./types";
import { ColorFormatType } from "./types";

export const isMac = process.platform === "darwin";
export const isWindows = process.platform === "win32";

const preferences = getPreferenceValues<ExtensionPreferences>();

export function getFormattedColor(_color: HistoryColor, format?: ColorFormatType) {
  return formatColor(_color, format || preferences.colorFormat);
}

export function getPreviewColor(color: HistoryColor) {
  return getFormattedColor(color, "oklch");
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

export const COPY_FORMATS: Array<{ format: CopyColorsFormat; title: string; icon: Icon }> = [
  { format: "json", title: "Copy Colors as JSON", icon: Icon.CodeBlock },
  { format: "css-classes", title: "Copy Colors as CSS Classes", icon: Icon.Brush },
  { format: "css-variables", title: "Copy Colors as CSS Variables", icon: Icon.Gear },
];

export function getColor(item: HistoryItem | string): HistoryColor {
  return typeof item === "string" ? item : item.color;
}

export function parseColorList(colors: string): string[] {
  const parsed = colors
    .split(";")
    .map((color) => color.trim())
    .filter((color) => color.length > 0);

  if (parsed.length === 0) {
    throw new Error("Provide at least one CSS color.");
  }

  return parsed;
}

export function copyAsJSON(items: (HistoryItem | string)[]): string {
  return JSON.stringify({ colors: items.map((item) => getFormattedColor(getColor(item))) }, null, 2);
}

export function copyAsCSSClasses(items: (HistoryItem | string)[]): string {
  return items
    .map((item, index) => {
      const color = getFormattedColor(getColor(item));
      return `.color-${index + 1} {\n  color: ${color};\n}`;
    })
    .join("\n\n");
}

export function copyAsCSSVariables(items: (HistoryItem | string)[]): string {
  const lines = items.map((item, index) => `  --color-${index + 1}: ${getFormattedColor(getColor(item))};`);
  return [":root {", ...lines, "}"].join("\n");
}

export function copySelectedColors(items: (HistoryItem | string)[], format: CopyColorsFormat): string {
  switch (format) {
    case "json":
      return copyAsJSON(items);
    case "css-classes":
      return copyAsCSSClasses(items);
    case "css-variables":
      return copyAsCSSVariables(items);
  }
}
