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

export default function KeyboardChord({
  chord,
  options = defaultOptions,
}: {
  chord: Chord;
  options?: ChordKeyboardOptions;
}) {
  const highlightTable = getHighlightTable(chord);
  const { whiteWidth, whiteHeight, blackWidth, blackHeight, highlightColor } = {
    ...defaultOptions,
    ...options,
  };

  return (
    <svg width={whiteWidth * 7 * 3} height={whiteHeight}>
      {[...Array(7 * 3).keys()].map((i) => (
        <rect
          key={`b${i}`}
          style={{
            fill: whiteIfActive(i, highlightTable) ? highlightColor : "white",
            stroke: "black",
            strokeWidth: 1,
          }}
          width={whiteWidth}
          height={whiteHeight}
          x={whiteWidth * i}
        />
      ))}
      {[...Array(5 * 3).keys()].map((i) => (
        <rect
          key={`w${i}`}
          style={{
            fill: blackIfActive(i, highlightTable) ? highlightColor : "black",
            stroke: "black",
            strokeWidth: 1,
          }}
          width={blackWidth}
          height={blackHeight}
          x={
            whiteWidth * bwMap3x.slice(0, blackOccurIndex[i]).filter((x) => x === bw.white).length -
            blackWidth / 2
          }
        />
      ))}
    </svg>
  );
}
