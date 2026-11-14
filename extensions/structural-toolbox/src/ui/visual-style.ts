import { environment } from "@raycast/api";
import { preferences } from "./state";
export const DETAIL_WIDTH = 560;
export function readableFont() {
  const saved = preferences().diagramTextSize || "readable";
  const sizes: Record<string, number> = {
    compact: 18,
    readable: 22,
    large: 26,
    "13": 18,
    "16": 20,
    "18": 22,
    "20": 26,
    "22": 22,
    "24": 24,
    "26": 26,
  };
  return sizes[saved] || 22;
}
export const smallFont = (font = readableFont()) => Math.max(18, font - 2);
export function palette() {
  return environment.appearance === "dark"
    ? {
        ink: "#e8eaf0",
        sub: "#c0c7d4",
        line: "#586476",
        blue: "#88b7ff",
        bg: "#25272d",
        soft: "#2d323d",
        border: "#526075",
        accent: "#253650",
        green: "#65c99c",
      }
    : {
        ink: "#252b35",
        sub: "#49576b",
        line: "#bac6d6",
        blue: "#235bb7",
        bg: "#ffffff",
        soft: "#f5f8fc",
        border: "#d7e0ec",
        accent: "#edf3ff",
        green: "#187b58",
      };
}
export const escapeSVG = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[c]!,
  );
/** Wrap labels instead of reducing their font size to fit. Long numeric tokens stay intact. */
export function wrapLabel(value: string, width: number, font: number) {
  const limit = Math.max(4, Math.floor(width / (font * 0.55))),
    lines: string[] = [];
  let line = "";
  for (const word of value.split(/\s+/)) {
    if (line && (line + " " + word).length > limit) {
      lines.push(line);
      line = word;
    } else line += (line ? " " : "") + word;
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}
export function svgLabel(
  x: number,
  y: number,
  value: string,
  size = readableFont(),
  color = palette().ink,
  weight = 400,
  anchor = "start",
) {
  return `<text x="${x}" y="${y}" text-anchor="${anchor}" style="font-size:${size}px;fill:${color};font-weight:${weight}">${escapeSVG(value)}</text>`;
}
export function wrappedLabel(
  x: number,
  y: number,
  value: string,
  width: number,
  size = smallFont(),
  color = palette().sub,
  weight = 400,
) {
  const lines = wrapLabel(value, width, size),
    lineHeight = size + 6;
  return {
    body: lines.map((line, i) => svgLabel(x, y + i * lineHeight, line, size, color, weight)).join(""),
    height: lines.length * lineHeight,
  };
}
