import { Grid, Color, getPreferenceValues } from "@raycast/api";
import { Icon8, Options, Preferences } from "../types/types";
import en from "javascript-time-ago/locale/en.json";
import TimeAgo from "javascript-time-ago";

const preferences: Preferences = getPreferenceValues();
export const gridSize: Grid.ItemSize = preferences.gridSize as Grid.ItemSize;
export const numRecent = preferences.numRecentRows * (gridSize === Grid.ItemSize.Small ? 8 : 5);
export const previewSize = gridSize === "small" ? "128" : "256";

TimeAgo.addDefaultLocale(en);
const timeAgo = new TimeAgo("en-US");

const colors: Color[] = [Color.Yellow, Color.Blue, Color.Purple, Color.Green, Color.Red];

export const getRandomColor = (): Color => {
  const index = Math.floor(Math.random() * colors.length);
  return colors[index];
};

export const formatDate = (input: Date | string): string => {
  const date = typeof input === "string" ? new Date(input) : input;
  return timeAgo.format(date) as string;
};

export const configureSVG = (icon: Icon8, options: Options): string => {
  let svg = icon.svg;
  const index = icon.svg.indexOf("<svg") + 4;
  if (!icon.isColor) {
    svg = `${svg.substring(0, index)} fill="${options.color}" ${svg.substring(index + 1)}`;
  }
  if (options.bgcolor) {
    svg = `${svg.substring(0, index)} style="background: ${options.bgcolor};" ${svg.substring(index + 1)}`;
  }
  if (options.padding != 0) {
    const s = 1 - options.padding / 100;
    const t = Number(((1 - s) * 100) / (2 * s)).toFixed(4);
    const a = svg.indexOf(">") + 1;
    const b = svg.lastIndexOf("<");
    const start = svg.substring(0, a);
    const middle = svg.substring(a, b);
    const end = svg.substring(b);
    svg = `${start}<g style="transform: scale(${s}) translate(${t}%, ${t}%);">${middle}</g>${end}`;
  }
  return svg;
};

export const getDetailPreviewLink = (icon: Icon8, color: string) => {
  color = icon.isColor ? "" : `/${color.slice(1)}`;
  return `https://img.icons8.com/${icon.platform}/300${color}/${icon.commonName}.png`;
};

export const getIconImageLink = (icon: Icon8, options: Options) => {
  const color = icon.isColor ? "" : `/${options.color.slice(1)}`;
  return `https://img.icons8.com/${icon.platform}/${options.size}${color}/${icon.commonName}.png`;
};

export const allStylesImage = "https://maxst.icons8.com/vue-static/icon/all-styles.png";

// boolean represents whether the preview image for the style requires color tint
export const defaultStyles: { [key: string]: boolean } = {
  "iOS 16": true,
  "iOS 16 Filled": true,
  "iOS 16 Glyph": true,
  "Material Filled": true,
  "Material Outlined": true,
  "Material Rounded": true,
  "Material Sharp": true,
  "Material Two Tone": true,
  "Windows 11 Color": false,
  "Windows 11 Outline": true,
  "Windows 11 Filled": true,
  "3D Plastilina": false,
  "SF Black": true,
  "SF Black Filled": true,
  "SF Regular": true,
  "SF Regular Filled": true,
  "SF Ultralight": true,
  "SF Ultralight Filled": true,
  "3D Fluency": false,
  Color: false,
  "Simple Small": true,
  "Glyph Neue": true,
  "Color Glass": false,
  Stickers: false,
  "Office XS": false,
  "Office S": false,
  Office: false,
  "Office L": false,
  "Cute Outline": true,
  "Cute Color": false,
  "Cute Clipart": false,
  "Blue UI": false,
  Dotted: true,
  Gradient: false,
  Pastel: true,
  "Pastel Glyph": true,
  "Ice Cream": true,
  Emoji: false,
  Plumpy: true,
  Doodle: false,
  Infographic: false,
  "Windows Metro": true,
  "Windows 10": true,
  Cloud: false,
  Bubbles: false,
  "Hand Drawn": true,
  "Color Hand Drawn": false,
  "Tiny Color": false,
  Laces: true,
  Arcade: false,
  Avantgarde: false,
  Parakeet: false,
};
