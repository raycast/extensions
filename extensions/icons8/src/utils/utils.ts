import { Color } from "@raycast/api";
import TimeAgo from "javascript-time-ago";
import en from "javascript-time-ago/locale/en.json";
import { parse, ElementNode, RootNode } from "svg-parser";

TimeAgo.addDefaultLocale(en);
const timeAgo = new TimeAgo("en-US");

const colors : Color[] = [
  Color.Yellow, 
  Color.Blue,
  Color.Purple, 
  Color.Green,
  Color.Red,
]

export const getRandomColor = (): Color => {
  const index = Math.floor(Math.random() * colors.length);
  return colors[index];
}

export const formatDate = (input: Date | string): string => {
  const date = typeof input === "string" ? new Date(input) : input;
  return timeAgo.format(date) as string;
};

export const svgToImage = (svg: string, height: number, width?: number, color?: string): string => {
  if (!width) width = height;
  if (color) {
    const index = svg.indexOf("<svg") + 4;
    svg = `${svg.substring(0, index)} fill="${color}" ${svg.substring(index)}`;
  }
  const svgBase64 = Buffer.from(svg, "utf-8").toString("base64");
  const image = `<img src="data:image/svg+xml;base64,${svgBase64}" width="${width}" height="${height}" />`;
  return image;
}

// boolean represents whether the preview image for the style requires color tint
export const defaultStyles: any = {
  "iOS": true,
  "iOS Filled": true,
  "iOS Glyph": true,
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
  "Color": false,
  "Simple Small": true,
  "Glyph Neue": true,
  "Color Glass": false,
  "Stickers": false,
  "Office XS": false,
  "Office S": false,
  "Office": false,
  "Office L": false,
  "Cute Outline": true,
  "Cute Color": false,
  "Cute Clipart": false,
  "Blue UI": false,
  "Dotted": true,
  "Gradient": false,
  "Pastel": true,
  "Pastel Glyph": true,
  "Ice Cream": true,
  "Emoji": false,
  "Plumpy": true,
  "Doodle": false,
  "Infographic": false,
  "Windows Metro": true,
  "Windows 10": true,
  "Cloud": false,
  "Bubbles": false,
  "Hand Drawn": true,
  "Color Hand Drawn": false,
};
