import { Chord } from "../libs/chord";
import { getHighlightTable } from "../libs/helper";
import { bw, bwMap } from "../libs/key";
import constants from "../libs/constants";

let blackOccurIndex = [1, 3, 6, 8, 10];
blackOccurIndex = [
  ...blackOccurIndex,
  ...blackOccurIndex.map((i) => i + bwMap.length),
  ...blackOccurIndex.map((i) => i + bwMap.length * 2),
];
let whiteOccurIndex = [0, 2, 4, 5, 7, 9, 11];
whiteOccurIndex = [
  ...whiteOccurIndex,
  ...whiteOccurIndex.map((i) => i + bwMap.length),
  ...whiteOccurIndex.map((i) => i + bwMap.length * 2),
];
const bwMap3x = [...bwMap, ...bwMap, ...bwMap];

function whiteIfActive(i: number, highlightTable: boolean[]) {
  return highlightTable[whiteOccurIndex[i]];
}

function blackIfActive(i: number, highlightTable: boolean[]) {
  return highlightTable[blackOccurIndex[i]];
}

export type ChordKeyboardOptions = {
  highlightColor: string;
  whiteWidth: number;
  whiteHeight: number;
  blackWidth: number;
  blackHeight: number;
};

const defaultOptions: ChordKeyboardOptions = {
  highlightColor: constants.colors.red,
  whiteWidth: constants.keyboard.whiteWidth,
  whiteHeight: constants.keyboard.whiteHeight,
  blackWidth: constants.keyboard.blackWidth,
  blackHeight: constants.keyboard.blackHeight,
};

/**
 * Escapes a value for safe use inside an XML/SVG attribute (double-quoted).
 */
function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function rect({
  fill,
  width,
  height,
  x,
}: {
  fill: string;
  width: number;
  height: number;
  x: number;
}): string {
  const style = escapeAttr(`fill:${fill};stroke:black;stroke-width:1`);
  return `<rect style="${style}" width="${width}" height="${height}" x="${x}"></rect>`;
}

/**
 * Renders the chord keyboard as a static SVG string.
 *
 * This intentionally builds the SVG markup with template literals instead of
 * React's server renderer. Raycast externalizes `react` at build time (the host
 * provides it at runtime), while the server renderer gets bundled at a fixed
 * version. When the host React version drifts, its internal version check throws
 * "Incompatible React versions". Rendering to a string directly removes that
 * dependency entirely.
 */
export function renderChordKeyboardSvg({
  chord,
  options = defaultOptions,
}: {
  chord: Chord;
  options?: ChordKeyboardOptions;
}): string {
  const highlightTable = getHighlightTable(chord);
  const { whiteWidth, whiteHeight, blackWidth, blackHeight, highlightColor } = {
    ...defaultOptions,
    ...options,
  };

  const whiteKeys = [...Array(7 * 3).keys()]
    .map((i) =>
      rect({
        fill: whiteIfActive(i, highlightTable) ? highlightColor : "white",
        width: whiteWidth,
        height: whiteHeight,
        x: whiteWidth * i,
      }),
    )
    .join("");

  const blackKeys = [...Array(5 * 3).keys()]
    .map((i) =>
      rect({
        fill: blackIfActive(i, highlightTable) ? highlightColor : "black",
        width: blackWidth,
        height: blackHeight,
        x:
          whiteWidth * bwMap3x.slice(0, blackOccurIndex[i]).filter((x) => x === bw.white).length -
          blackWidth / 2,
      }),
    )
    .join("");

  return `<svg width="${whiteWidth * 7 * 3}" height="${whiteHeight}">${whiteKeys}${blackKeys}</svg>`;
}
