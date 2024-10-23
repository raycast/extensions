import { splitEvery } from "ramda";
import BitField from "bitfield";
import { renderToString } from "react-dom/server";
import { environment } from "@raycast/api";
import { darken, mix } from "polished";

const colors =
  environment.appearance === "light"
    ? {
        gray: "#C8CAC9",
        accent: "#007DD7",
      }
    : {
        gray: "#363A3A",
        accent: "#007DD7",
      };

interface CellProps {
  alpha: number;
  complete: boolean;
  colors: {
    gray: string;
    accent: string;
  };
  cellSize: number;
  px: number;
  colIndex: number;
  rowIndex: number;
}

const Cell = ({ alpha, complete, colors, cellSize, px, colIndex, rowIndex }: CellProps) => {
  if (complete) alpha = 1;

  const radius = px * 5;
  const margin = px * 3;
  const fill = alpha < 0.1 ? colors.gray : colors.accent;
  const opacity = alpha < 0.1 ? 1 : Math.max(0.5, alpha);
  const color = mix(opacity, fill, colors.gray);
  const size = cellSize - margin * 2;
  return (
    <rect
      fill={color}
      fillOpacity={opacity}
      x={colIndex * cellSize + margin}
      y={rowIndex * cellSize}
      stroke={darken(0.1, color)}
      strokeWidth={px}
      width={size}
      height={size}
      rx={radius}
      ry={radius}
    />
  );
};

// Greatest common divisor of 2 integers
function gcd2(a: number, b: number): number {
  if (!b) return b === 0 ? a : NaN;
  return gcd2(b, a % b);
}

// Least common multiple of 2 integers
function lcm2(a: number, b: number): number {
  return (a * b) / gcd2(a, b);
}

// Least common multiple of a list of integers
function lcm(array: number[]): number {
  let n = 1;
  for (let i = 0; i < array.length; ++i) n = lcm2(array[i], n);
  return n;
}

// Average number of a list of integers
function avg(array: number[]): number {
  return array.reduce((a, b) => a + b) / array.length;
}

export async function renderPieces({
  pieces,
  width = 435,
  complete = false,
}: {
  pieces: string;
  width?: number;
  complete?: boolean;
}): Promise<string> {
  const buffer = Buffer.from(pieces, "base64");
  const bitfield = new BitField(buffer);

  const cols = 30;
  const rows = 5;
  const cellsCount = cols * rows;

  const bits: number[] = [];
  bitfield.forEach((bit) => bits.push(bit ? 1 : 0));

  const factor = lcm([bits.length, cellsCount]) / bits.length;
  const expandedBits = bits.flatMap((bit) => Array(factor).fill(bit));
  const cells = splitEvery(Math.floor(expandedBits.length / cellsCount), expandedBits).map((nums) => avg(nums));

  const px = (100 / width) * 2;
  const cellSize = width / cols;

  const cellsMarkup = splitEvery(cols, cells)
    .map((row: number[], rowIndex: number) =>
      row.map((alpha, colIndex) => (
        <Cell
          key={`${rowIndex}-${colIndex}`}
          alpha={alpha}
          complete={complete}
          colors={colors}
          cellSize={cellSize}
          px={px}
          colIndex={colIndex}
          rowIndex={rowIndex}
        />
      )),
    )
    .flat();

  return renderToString(
    <svg viewBox={`0 0 ${width} ${width}`} xmlns="http://www.w3.org/2000/svg">
      {cellsMarkup}
    </svg>,
  );
}
