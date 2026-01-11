import { type AliasNode, isLeafNode, isPrefixNode } from "../lib/treeUtils";

export interface KeyboardColors {
  background: string;
  keyBackground: string;
  keyStroke: string;
  keyText: string;
  prefix: string; // Folder color
  complete: string; // Action color
  both: string; // Both color
}

const QWERTY_ROWS = [
  ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "="],
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "[", "]", "\\"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l", ";", "'"],
  ["z", "x", "c", "v", "b", "n", "m", ",", ".", "/"],
];

const KEY_WIDTH = 50;
const KEY_HEIGHT = 50;
const KEY_SPACING = 5;
const ROW_OFFSET_INCREMENTS = [0, 25, 35, 60];

export function generateKeyboardSvg(node: AliasNode, colors: KeyboardColors): string {
  const keyStates = new Map<string, { state: "none" | "prefix" | "complete" | "both" }>();

  for (const [key, childNode] of Object.entries(node.children)) {
    const isLeaf = isLeafNode(childNode);
    const isPrefix = isPrefixNode(childNode);

    let state: "none" | "prefix" | "complete" | "both" = "none";

    if (isLeaf && isPrefix) {
      state = "both";
    } else if (isLeaf) {
      state = "complete";
    } else if (isPrefix) {
      state = "prefix";
    }

    keyStates.set(key.toLowerCase(), { state });
  }

  let svgContent = "";
  let yOffset = 20;

  for (let rowIndex = 0; rowIndex < QWERTY_ROWS.length; rowIndex++) {
    const row = QWERTY_ROWS[rowIndex];
    const xOffset = 20 + ROW_OFFSET_INCREMENTS[rowIndex];

    for (let keyIndex = 0; keyIndex < row.length; keyIndex++) {
      const key = row[keyIndex];
      const state = keyStates.get(key.toLowerCase())?.state || "none";

      const x = xOffset + keyIndex * (KEY_WIDTH + KEY_SPACING);
      const y = yOffset;

      let fillColor = colors.keyBackground;
      let strokeColor = colors.keyStroke;

      if (state === "prefix") {
        fillColor = colors.prefix;
        strokeColor = colors.prefix;
      } else if (state === "complete") {
        fillColor = colors.complete;
        strokeColor = colors.complete;
      } else if (state === "both") {
        fillColor = colors.both;
        strokeColor = colors.both;
      }

      let textFill = colors.keyText;
      if (state === "prefix" || state === "both") {
        textFill = "#FFFFFF"; // Red background -> White text
      } else if (state === "complete") {
        textFill = colors.background; // Contrast with action color
      }

      svgContent += `<rect x="${x}" y="${y}" width="${KEY_WIDTH}" height="${KEY_HEIGHT}" rx="6" fill="${fillColor}" stroke="${strokeColor}" stroke-width="1.5"/>`;
      svgContent += `<text x="${x + KEY_WIDTH / 2}" y="${y + KEY_HEIGHT / 2 + 6}" font-family="system-ui, sans-serif" font-size="18" font-weight="600" fill="${textFill}" text-anchor="middle">${key.toUpperCase()}</text>`;
    }

    yOffset += KEY_HEIGHT + KEY_SPACING + 5;
  }

  const totalWidth = 720;
  const totalHeight = yOffset + 20;

  const svg = `
<svg width="${totalWidth}" height="${totalHeight}" viewBox="0 0 ${totalWidth} ${totalHeight}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" rx="12" fill="${colors.background}"/>
  ${svgContent}
</svg>
  `.trim();

  return svg;
}

export function svgToDataUri(svg: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}
