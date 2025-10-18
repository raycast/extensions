import { environment } from "@raycast/api";
import type { Entry } from "./types";

const yMultiplier = process.platform === "win32" ? 0.8 : 0.9;
const sizeMultiplier = process.platform === "win32" ? 0.8 : 0.6;

function escapeXml(str: string): string {
  return Array.from(str)
    .map((c) => `&#x${c.codePointAt(0)!.toString(16)};`)
    .join("");
}

const textColor = environment.appearance === "dark" ? "#FFFFFF" : "#000000";

export function getCharSvg(
  item: Entry,
  size: number | [number, number] = 200,
  color: string = textColor,
) {
  let width: number;
  let height: number;
  if (Array.isArray(size)) {
    [width, height] = size;
  } else {
    width = size;
    height = size;
  }
  const dataUrl = `data:image/svg+xml;base64,${btoa(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><text x="${width / 2}" y="${height * yMultiplier}" text-anchor="middle" font-size="${height * sizeMultiplier}px" font-family="system-ui, sans-serif" fill="${color}">${escapeXml(item.char)}</text></svg>`,
  )}`;
  return dataUrl;
}
