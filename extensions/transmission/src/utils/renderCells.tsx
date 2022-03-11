import { splitEvery } from "ramda";
import { isDarkMode } from "./darkMode";

const theme = {
  light: {
    primary: "#999A9A",
    secondary: "#C8C7C9",
  },
  dark: {
    primary: "#4F4F51",
    secondary: "#39393B",
  },
};

export async function renderPieces(pieces: string, pieceCount: number, width = 1000): Promise<string> {
  const isDark = await isDarkMode();

  const colors = theme[isDark ? "dark" : "light"];

  const w = Math.pow(18, 2);

  const ppp = pieceCount / w; // pieceCount per pixel

  pieces = Buffer.from(pieces, "base64").toString("utf8");

  const cells = [];
  let bitIndex = 0.0;
  let sb: number, eb: number, db: number;
  let b = 0,
    c = 0;

  for (let i = 0, len = pieces.length; i < len; ++i) {
    b = (b << 8) | pieces.charCodeAt(i);
    bitIndex += 8.0;
    sb = Math.round(bitIndex);
    while (bitIndex > ppp) {
      bitIndex -= ppp;
      eb = Math.round(bitIndex);
      db = sb - eb;

      c = b >> eb;
      c <<= 32 - db;
      c = c - ((c >> 1) & 0x55555555);
      c = (c & 0x33333333) + ((c >> 2) & 0x33333333);
      c = (((c + (c >> 4)) & 0x0f0f0f0f) * 0x01010101) >> 24;

      cells.push((c / db) * 8);

      sb = eb;
    }
  }

  const strokeWidth = width / 100;
  const cellSize = width / 18;
  const cellsMarkup = splitEvery(18, cells)
    .map((row: number[], rowIndex: number) =>
      row.map(
        (alpha, colIndex) =>
          `<rect fill="#007DD6" fill-opacity="${alpha}" x="${colIndex * cellSize}" y="${
            rowIndex * cellSize
          }" width="${cellSize}" height="${cellSize}" stroke="${colors.secondary}" stroke-width="${strokeWidth}" />`
      )
    )
    .flat()
    .join("");

  return `<svg style="width: 100%;" viewBox="0 0 ${width} ${width}" xmlns="http://www.w3.org/2000/svg">
    ${cellsMarkup}
    <rect x="0" y="0" width="${width}" height="${width}" stroke="${colors.primary}" stroke-width="${
    strokeWidth * 1.5
  }" fill="transparent" />
  </svg>`;
}
