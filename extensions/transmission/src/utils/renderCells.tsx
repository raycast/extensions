import { splitEvery } from "ramda";
import BitField from "bitfield";
import { renderToString } from "react-dom/server";

const colors = {
  gray: "#888888",
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
  strokeWidth: number;
  colIndex: number;
  rowIndex: number;
}

const Cell = ({ alpha, complete, colors, cellSize, strokeWidth, colIndex, rowIndex }: CellProps) => {
  if (complete) alpha = 1;

  const fill = alpha < 0.1 ? colors.gray : colors.accent;
  const opacity = alpha < 0.1 ? 1 : Math.max(0.5, alpha);
  const size = cellSize - strokeWidth * 2;
  return (
    <rect
      fill={fill}
      fillOpacity={opacity}
      x={colIndex * cellSize + strokeWidth}
      y={rowIndex * cellSize}
      width={size}
      height={size}
      rx={strokeWidth}
      ry={strokeWidth}
    />
  );
};

export async function renderPieces({
  pieces,
  width = 1000,
  complete = false,
}: {
  pieces: string;
  width?: number;
  complete?: boolean;
}): Promise<string> {
  const buffer = Buffer.from(pieces, "base64");
  const bitfield = new BitField(buffer);

  const cellsCount = Math.pow(18, 2);

  let bits: boolean[] = [];
  bitfield.forEach((bit) => bits.push(bit));

  // if we don't have enough pieces to compose a graph, we multiply them
  if (bits.length < cellsCount) {
    const diff = Math.ceil(cellsCount / bits.length);
    bits = bits.map((bit) => Array.from({ length: diff }, () => bit)).flat();
  }

  const cells =
    bits.length > 0
      ? splitEvery(Math.round(bits.length / cellsCount), bits).map(
          (chunk) => ((100 / chunk.length) * chunk.filter(Boolean).length) / 100
        )
      : Array.from({ length: cellsCount }).map(() => 0);

  const strokeWidth = width / 100;
  const cellSize = width / 18;

  const cellsMarkup = splitEvery(18, cells)
    .map((row: number[], rowIndex: number) =>
      row.map((alpha, colIndex) => (
        <Cell
          key={`${rowIndex}-${colIndex}`}
          alpha={alpha}
          complete={complete}
          colors={colors}
          cellSize={cellSize}
          strokeWidth={strokeWidth}
          colIndex={colIndex}
          rowIndex={rowIndex}
        />
      ))
    )
    .flat();

  return renderToString(
    <svg viewBox={`0 0 ${width} ${width}`} xmlns="http://www.w3.org/2000/svg">
      {cellsMarkup}
    </svg>
  );
}
