import { splitEvery } from "ramda";
import { isDarkMode } from "./darkMode";
import BitField from "bitfield";
import { renderToString } from "react-dom/server";

const theme = {
  light: {
    gray: "#C8C7C9",
    accent: "#007DD7",
  },
  dark: {
    gray: "#4F4F51",
    accent: "#007DD7",
  },
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
  const isDark = await isDarkMode();

  const colors = theme[isDark ? "dark" : "light"];

  const buffer = Buffer.from(pieces, "base64");
  const bitfield = new BitField(buffer);

  const cellsCount = Math.pow(18, 2);

  const bits: boolean[] = [];
  bitfield.forEach((bit) => bits.push(bit));

  const cells = splitEvery(bits.length / cellsCount, bits).map(
    (chunk) => ((100 / chunk.length) * chunk.filter(Boolean).length) / 100
  );

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
