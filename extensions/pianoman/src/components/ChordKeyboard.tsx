/** @jsxImportSource preact */
import render from "preact-render-to-string";
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

type ChordKeyboardSvgProps = {
  chord: Chord;
  options?: ChordKeyboardOptions;
};

/**
 * Static SVG keyboard markup. Compiled with Preact (per-file pragma) and rendered
 * to a string via preact-render-to-string — isolated from Raycast's host React.
 */
function ChordKeyboardSvg({ chord, options = defaultOptions }: ChordKeyboardSvgProps) {
  const highlightTable = getHighlightTable(chord);
  const { whiteWidth, whiteHeight, blackWidth, blackHeight, highlightColor } = {
    ...defaultOptions,
    ...options,
  };

  return (
    // xmlns is required so the output is a valid standalone SVG document when
    // embedded as a data: URI (Grid.Item content / Detail markdown images).
    // React DOM's server renderer added this automatically; Preact does not.
    <svg xmlns="http://www.w3.org/2000/svg" width={whiteWidth * 7 * 3} height={whiteHeight}>
      {[...Array(7 * 3).keys()].map((i) => (
        <rect
          key={`w${i}`}
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
          key={`b${i}`}
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

export function renderChordKeyboardSvg(props: ChordKeyboardSvgProps): string {
  return render(<ChordKeyboardSvg {...props} />);
}
