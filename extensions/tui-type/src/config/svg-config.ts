import { Icon } from "@raycast/api";
import { SvgSettings } from "../types";

export interface SvgSettingOption<T = string> {
  value: T;
  title: string;
  icon?: { source: Icon; tintColor?: string };
}

export interface SvgSettingConfig<K extends keyof SvgSettings> {
  key: K;
  title: string;
  options: SvgSettingOption<SvgSettings[K]>[];
}

// Font Size Options
export const FONT_SIZE_OPTIONS: SvgSettingOption<string>[] = [
  { value: "32", title: "Small (32px)" },
  { value: "40", title: "Medium (40px)" },
  { value: "48", title: "Large (48px)" },
];

// Caret Style Options
export const CARET_STYLE_OPTIONS: SvgSettingOption<string>[] = [
  { value: "block", title: "Block" },
  { value: "line", title: "Line" },
  { value: "underscore", title: "Underscore" },
];

// Color Options
export const COLOR_CORRECT_OPTIONS: SvgSettingOption<string>[] = [
  {
    value: "#eeeeee",
    title: "Standard Gray",
    icon: { source: Icon.CircleFilled, tintColor: "#eeeeee" },
  },
  {
    value: "#ffffff",
    title: "Pure White",
    icon: { source: Icon.CircleFilled, tintColor: "#ffffff" },
  },
  {
    value: "#44ff44",
    title: "Neon Green",
    icon: { source: Icon.CircleFilled, tintColor: "#44ff44" },
  },
  {
    value: "#4488ff",
    title: "Soft Blue",
    icon: { source: Icon.CircleFilled, tintColor: "#4488ff" },
  },
  {
    value: "#00ff00",
    title: "Bright Green",
    icon: { source: Icon.CircleFilled, tintColor: "#00ff00" },
  },
  {
    value: "#00ffff",
    title: "Cyan",
    icon: { source: Icon.CircleFilled, tintColor: "#00ffff" },
  },
  {
    value: "#ffff00",
    title: "Yellow",
    icon: { source: Icon.CircleFilled, tintColor: "#ffff00" },
  },
  {
    value: "#ffcc00",
    title: "Gold",
    icon: { source: Icon.CircleFilled, tintColor: "#ffcc00" },
  },
  {
    value: "#00ccff",
    title: "Sky Blue",
    icon: { source: Icon.CircleFilled, tintColor: "#00ccff" },
  },
  {
    value: "#ccffcc",
    title: "Pale Green",
    icon: { source: Icon.CircleFilled, tintColor: "#ccffcc" },
  },
  {
    value: "#ccccff",
    title: "Pale Blue",
    icon: { source: Icon.CircleFilled, tintColor: "#ccccff" },
  },
  {
    value: "#e0e0e0",
    title: "Light Gray",
    icon: { source: Icon.CircleFilled, tintColor: "#e0e0e0" },
  },
  {
    value: "#bada55",
    title: "Lime",
    icon: { source: Icon.CircleFilled, tintColor: "#bada55" },
  },
  {
    value: "#aaffaa",
    title: "Mint",
    icon: { source: Icon.CircleFilled, tintColor: "#aaffaa" },
  },
  {
    value: "#aaffff",
    title: "Aqua",
    icon: { source: Icon.CircleFilled, tintColor: "#aaffff" },
  },
  {
    value: "#f0fff0",
    title: "Honeydew",
    icon: { source: Icon.CircleFilled, tintColor: "#f0fff0" },
  },
  {
    value: "#f5f5dc",
    title: "Beige",
    icon: { source: Icon.CircleFilled, tintColor: "#f5f5dc" },
  },
  {
    value: "#d3ffd3",
    title: "Pastel Green",
    icon: { source: Icon.CircleFilled, tintColor: "#d3ffd3" },
  },
  {
    value: "#e6ffe6",
    title: "Very Light Green",
    icon: { source: Icon.CircleFilled, tintColor: "#e6ffe6" },
  },
  {
    value: "#e6f7ff",
    title: "Very Light Blue",
    icon: { source: Icon.CircleFilled, tintColor: "#e6f7ff" },
  },
];

export const COLOR_WRONG_OPTIONS: SvgSettingOption<string>[] = [
  {
    value: "#ff4444",
    title: "Standard Red",
    icon: { source: Icon.CircleFilled, tintColor: "#ff4444" },
  },
  {
    value: "#ff8800",
    title: "Bright Orange",
    icon: { source: Icon.CircleFilled, tintColor: "#ff8800" },
  },
  {
    value: "#ff00ff",
    title: "Magenta",
    icon: { source: Icon.CircleFilled, tintColor: "#ff00ff" },
  },
  {
    value: "#ff0000",
    title: "Pure Red",
    icon: { source: Icon.CircleFilled, tintColor: "#ff0000" },
  },
  {
    value: "#ff6666",
    title: "Light Red",
    icon: { source: Icon.CircleFilled, tintColor: "#ff6666" },
  },
  {
    value: "#ffb3b3",
    title: "Pale Red",
    icon: { source: Icon.CircleFilled, tintColor: "#ffb3b3" },
  },
  {
    value: "#ff6347",
    title: "Tomato",
    icon: { source: Icon.CircleFilled, tintColor: "#ff6347" },
  },
  {
    value: "#ff4500",
    title: "Orange Red",
    icon: { source: Icon.CircleFilled, tintColor: "#ff4500" },
  },
  {
    value: "#ff1493",
    title: "Deep Pink",
    icon: { source: Icon.CircleFilled, tintColor: "#ff1493" },
  },
  {
    value: "#e60026",
    title: "Crimson",
    icon: { source: Icon.CircleFilled, tintColor: "#e60026" },
  },
  {
    value: "#c71585",
    title: "Medium Violet Red",
    icon: { source: Icon.CircleFilled, tintColor: "#c71585" },
  },
  {
    value: "#ff69b4",
    title: "Hot Pink",
    icon: { source: Icon.CircleFilled, tintColor: "#ff69b4" },
  },
  {
    value: "#ff7f50",
    title: "Coral",
    icon: { source: Icon.CircleFilled, tintColor: "#ff7f50" },
  },
  {
    value: "#ffa07a",
    title: "Light Salmon",
    icon: { source: Icon.CircleFilled, tintColor: "#ffa07a" },
  },
  {
    value: "#ffd700",
    title: "Gold",
    icon: { source: Icon.CircleFilled, tintColor: "#ffd700" },
  },
  {
    value: "#ffdab9",
    title: "Peach Puff",
    icon: { source: Icon.CircleFilled, tintColor: "#ffdab9" },
  },
  {
    value: "#ffcccb",
    title: "Very Light Red",
    icon: { source: Icon.CircleFilled, tintColor: "#ffcccb" },
  },
  {
    value: "#b22222",
    title: "Firebrick",
    icon: { source: Icon.CircleFilled, tintColor: "#b22222" },
  },
  {
    value: "#dc143c",
    title: "Crimson Red",
    icon: { source: Icon.CircleFilled, tintColor: "#dc143c" },
  },
  {
    value: "#8b0000",
    title: "Dark Red",
    icon: { source: Icon.CircleFilled, tintColor: "#8b0000" },
  },
  {
    value: "#a52a2a",
    title: "Brown",
    icon: { source: Icon.CircleFilled, tintColor: "#a52a2a" },
  },
  {
    value: "#ff2400",
    title: "Scarlet",
    icon: { source: Icon.CircleFilled, tintColor: "#ff2400" },
  },
  {
    value: "#ff5e13",
    title: "Pumpkin",
    icon: { source: Icon.CircleFilled, tintColor: "#ff5e13" },
  },
  {
    value: "#ff6f61",
    title: "Living Coral",
    icon: { source: Icon.CircleFilled, tintColor: "#ff6f61" },
  },
  {
    value: "#ffb347",
    title: "Pastel Orange",
    icon: { source: Icon.CircleFilled, tintColor: "#ffb347" },
  },
  {
    value: "#ffcc99",
    title: "Apricot",
    icon: { source: Icon.CircleFilled, tintColor: "#ffcc99" },
  },
  {
    value: "#ffecb3",
    title: "Light Gold",
    icon: { source: Icon.CircleFilled, tintColor: "#ffecb3" },
  },
];

export const COLOR_NEXT_OPTIONS: SvgSettingOption<string>[] = [
  {
    value: "#666666",
    title: "Dark Gray",
    icon: { source: Icon.CircleFilled, tintColor: "#666666" },
  },
  {
    value: "#888888",
    title: "Medium Gray",
    icon: { source: Icon.CircleFilled, tintColor: "#888888" },
  },
  {
    value: "#aaaaaa",
    title: "Light Gray",
    icon: { source: Icon.CircleFilled, tintColor: "#aaaaaa" },
  },
  {
    value: "#444444",
    title: "Charcoal",
    icon: { source: Icon.CircleFilled, tintColor: "#444444" },
  },
  {
    value: "#222222",
    title: "Almost Black",
    icon: { source: Icon.CircleFilled, tintColor: "#222222" },
  },
  {
    value: "#bbbbbb",
    title: "Silver",
    icon: { source: Icon.CircleFilled, tintColor: "#bbbbbb" },
  },
  {
    value: "#cccccc",
    title: "Pale Gray",
    icon: { source: Icon.CircleFilled, tintColor: "#cccccc" },
  },
  {
    value: "#dddddd",
    title: "Very Pale Gray",
    icon: { source: Icon.CircleFilled, tintColor: "#dddddd" },
  },
  {
    value: "#ffffff",
    title: "White",
    icon: { source: Icon.CircleFilled, tintColor: "#ffffff" },
  },
  {
    value: "#000000",
    title: "Black",
    icon: { source: Icon.CircleFilled, tintColor: "#000000" },
  },
  {
    value: "#3a3a3a",
    title: "Slate",
    icon: { source: Icon.CircleFilled, tintColor: "#3a3a3a" },
  },
  {
    value: "#5a5a5a",
    title: "Graphite",
    icon: { source: Icon.CircleFilled, tintColor: "#5a5a5a" },
  },
  {
    value: "#7f8c8d",
    title: "Concrete",
    icon: { source: Icon.CircleFilled, tintColor: "#7f8c8d" },
  },
  {
    value: "#95a5a6",
    title: "Clouds",
    icon: { source: Icon.CircleFilled, tintColor: "#95a5a6" },
  },
  {
    value: "#bdc3c7",
    title: "Silver Sand",
    icon: { source: Icon.CircleFilled, tintColor: "#bdc3c7" },
  },
  {
    value: "#e0e0e0",
    title: "Platinum",
    icon: { source: Icon.CircleFilled, tintColor: "#e0e0e0" },
  },
  {
    value: "#f5f5f5",
    title: "Smoke",
    icon: { source: Icon.CircleFilled, tintColor: "#f5f5f5" },
  },
  {
    value: "#b0b0b0",
    title: "Ash",
    icon: { source: Icon.CircleFilled, tintColor: "#b0b0b0" },
  },
  {
    value: "#a9a9a9",
    title: "Dark Silver",
    icon: { source: Icon.CircleFilled, tintColor: "#a9a9a9" },
  },
  {
    value: "#c0c0c0",
    title: "Classic Silver",
    icon: { source: Icon.CircleFilled, tintColor: "#c0c0c0" },
  },
  {
    value: "#d3d3d3",
    title: "Light Silver",
    icon: { source: Icon.CircleFilled, tintColor: "#d3d3d3" },
  },
  {
    value: "#ededed",
    title: "Eggshell",
    icon: { source: Icon.CircleFilled, tintColor: "#ededed" },
  },
  {
    value: "#e6e6e6",
    title: "Mist",
    icon: { source: Icon.CircleFilled, tintColor: "#e6e6e6" },
  },
  {
    value: "#fafafa",
    title: "Snow",
    icon: { source: Icon.CircleFilled, tintColor: "#fafafa" },
  },
];

export const COLOR_HIGHLIGHT_OPTIONS: SvgSettingOption<string>[] = [
  {
    value: "#2a2a2a",
    title: "Dark Box",
    icon: { source: Icon.CircleFilled, tintColor: "#2a2a2a" },
  },
  {
    value: "#1a2a3a",
    title: "Blue Tint",
    icon: { source: Icon.CircleFilled, tintColor: "#1a2a3a" },
  },
  {
    value: "transparent",
    title: "No Background",
    icon: { source: Icon.CircleFilled, tintColor: "#808080" },
  },
  {
    value: "#ffd700",
    title: "Gold",
    icon: { source: Icon.CircleFilled, tintColor: "#ffd700" },
  },
  {
    value: "#ffecb3",
    title: "Light Gold",
    icon: { source: Icon.CircleFilled, tintColor: "#ffecb3" },
  },
  {
    value: "#fffacd",
    title: "Lemon Chiffon",
    icon: { source: Icon.CircleFilled, tintColor: "#fffacd" },
  },
  {
    value: "#ffffe0",
    title: "Light Yellow",
    icon: { source: Icon.CircleFilled, tintColor: "#ffffe0" },
  },
  {
    value: "#e0ffe0",
    title: "Pale Green",
    icon: { source: Icon.CircleFilled, tintColor: "#e0ffe0" },
  },
  {
    value: "#e0f7fa",
    title: "Cyan Tint",
    icon: { source: Icon.CircleFilled, tintColor: "#e0f7fa" },
  },
  {
    value: "#e6e6fa",
    title: "Lavender",
    icon: { source: Icon.CircleFilled, tintColor: "#e6e6fa" },
  },
  {
    value: "#ffe4e1",
    title: "Misty Rose",
    icon: { source: Icon.CircleFilled, tintColor: "#ffe4e1" },
  },
  {
    value: "#f5f5dc",
    title: "Beige",
    icon: { source: Icon.CircleFilled, tintColor: "#f5f5dc" },
  },
  {
    value: "#f0fff0",
    title: "Honeydew",
    icon: { source: Icon.CircleFilled, tintColor: "#f0fff0" },
  },
  {
    value: "#f5fffa",
    title: "Mint Cream",
    icon: { source: Icon.CircleFilled, tintColor: "#f5fffa" },
  },
  {
    value: "#ffe4b5",
    title: "Moccasin",
    icon: { source: Icon.CircleFilled, tintColor: "#ffe4b5" },
  },
  {
    value: "#fafad2",
    title: "Light Goldenrod",
    icon: { source: Icon.CircleFilled, tintColor: "#fafad2" },
  },
  {
    value: "#d3ffd3",
    title: "Pastel Green",
    icon: { source: Icon.CircleFilled, tintColor: "#d3ffd3" },
  },
  {
    value: "#e6ffe6",
    title: "Very Light Green",
    icon: { source: Icon.CircleFilled, tintColor: "#e6ffe6" },
  },
  {
    value: "#e6f7ff",
    title: "Very Light Blue",
    icon: { source: Icon.CircleFilled, tintColor: "#e6f7ff" },
  },
  {
    value: "#fff0f5",
    title: "Lavender Blush",
    icon: { source: Icon.CircleFilled, tintColor: "#fff0f5" },
  },
  {
    value: "#ffe4c4",
    title: "Bisque",
    icon: { source: Icon.CircleFilled, tintColor: "#ffe4c4" },
  },
  {
    value: "#f0e68c",
    title: "Khaki",
    icon: { source: Icon.CircleFilled, tintColor: "#f0e68c" },
  },
  {
    value: "#f8f8ff",
    title: "Ghost White",
    icon: { source: Icon.CircleFilled, tintColor: "#f8f8ff" },
  },
  {
    value: "#fffaf0",
    title: "Floral White",
    icon: { source: Icon.CircleFilled, tintColor: "#fffaf0" },
  },
  {
    value: "#fdf5e6",
    title: "Old Lace",
    icon: { source: Icon.CircleFilled, tintColor: "#fdf5e6" },
  },
  {
    value: "#f5f5f5",
    title: "Smoke",
    icon: { source: Icon.CircleFilled, tintColor: "#f5f5f5" },
  },
  {
    value: "#dcdcdc",
    title: "Gainsboro",
    icon: { source: Icon.CircleFilled, tintColor: "#dcdcdc" },
  },
  {
    value: "#bada55",
    title: "Lime",
    icon: { source: Icon.CircleFilled, tintColor: "#bada55" },
  },
  {
    value: "#aaffaa",
    title: "Mint",
    icon: { source: Icon.CircleFilled, tintColor: "#aaffaa" },
  },
  {
    value: "#aaffff",
    title: "Aqua",
    icon: { source: Icon.CircleFilled, tintColor: "#aaffff" },
  },
  {
    value: "#ffe5b4",
    title: "Peach",
    icon: { source: Icon.CircleFilled, tintColor: "#ffe5b4" },
  },
  {
    value: "#f0f8ff",
    title: "Alice Blue",
    icon: { source: Icon.CircleFilled, tintColor: "#f0f8ff" },
  },
  {
    value: "#fff8dc",
    title: "Cornsilk",
    icon: { source: Icon.CircleFilled, tintColor: "#fff8dc" },
  },
  {
    value: "#f5deb3",
    title: "Wheat",
    icon: { source: Icon.CircleFilled, tintColor: "#f5deb3" },
  },
  {
    value: "#e0e0e0",
    title: "Light Gray",
    icon: { source: Icon.CircleFilled, tintColor: "#e0e0e0" },
  },
  {
    value: "#ccccff",
    title: "Pale Blue",
    icon: { source: Icon.CircleFilled, tintColor: "#ccccff" },
  },
  {
    value: "#ccffcc",
    title: "Pale Green",
    icon: { source: Icon.CircleFilled, tintColor: "#ccffcc" },
  },
  {
    value: "#fff",
    title: "White",
    icon: { source: Icon.CircleFilled, tintColor: "#fff" },
  },
  {
    value: "#000",
    title: "Black",
    icon: { source: Icon.CircleFilled, tintColor: "#000" },
  },
];

export const SVG_SETTINGS_CONFIG: SvgSettingConfig<keyof SvgSettings>[] = [
  {
    key: "fontSize",
    title: "Font Size",
    options: FONT_SIZE_OPTIONS,
  },
  {
    key: "caretStyle",
    title: "Caret Style",
    options: CARET_STYLE_OPTIONS,
  },
  {
    key: "colorCorrect",
    title: "Correct Color",
    options: COLOR_CORRECT_OPTIONS,
  },
  {
    key: "colorWrong",
    title: "Wrong Color",
    options: COLOR_WRONG_OPTIONS,
  },
  {
    key: "colorNext",
    title: "Next Text Color",
    options: COLOR_NEXT_OPTIONS,
  },
  {
    key: "colorHighlight",
    title: "Highlight Color",
    options: COLOR_HIGHLIGHT_OPTIONS,
  },
];

// Default SVG Settings
export const DEFAULT_SVG: SvgSettings = {
  fontSize: "40",
  colorCorrect: "#eeeeee",
  colorWrong: "#ff4444",
  colorNext: "#666666",
  colorHighlight: "#2a2a2a",
  caretStyle: "line",
};
