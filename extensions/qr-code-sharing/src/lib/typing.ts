import { Box } from "./codes";

const COLORS = { lower: "#262626", upper: "#ae7f5f", digit: "#ff8c2e", symbol: "#0a84ff" };

/** Visible stand-ins for characters that would otherwise draw nothing. */
const VISIBLE: Record<string, string> = { " ": "␣", "\n": "↵", "\t": "⇥" };

const GAP = 12;
const MAX_COLS = 24;

function colorOf(char: string): string {
  if (/\d/.test(char)) return COLORS.digit;
  if (/\p{L}/u.test(char)) return char === char.toUpperCase() ? COLORS.upper : COLORS.lower;
  return COLORS.symbol;
}

const escapeXml = (char: string) => char.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

/**
 * One cell per character, colored by kind, so every character can be told apart when typing
 * it on another device: letters dark, capitals brown, digits orange, symbols blue.
 * Cells shrink (more columns) until the whole text fits the box; past that it is cut short.
 */
export function typingMarkdown(content: string, box: Box): string {
  const chars = Array.from(content);
  let cols = 7;
  const fits = (c: number) => {
    const cell = box.width / c;
    return Math.ceil(chars.length / c) * (cell * 1.4 + GAP) - GAP <= box.height;
  };
  while (cols < MAX_COLS && !fits(cols)) cols++;

  const cellW = box.width / cols;
  const cellH = cellW * 1.4;
  const maxRows = Math.max(1, Math.floor((box.height + GAP) / (cellH + GAP)));
  const shown = chars.length > cols * maxRows ? [...chars.slice(0, cols * maxRows - 1), "…"] : chars;
  const rows = Math.ceil(shown.length / cols);
  const height = rows * (cellH + GAP) - GAP;
  const fontSize = Math.min(cellH * 0.5, cellW * 0.85);

  let svg = "";
  for (let r = 0; r < rows; r++) {
    const row = shown.slice(r * cols, (r + 1) * cols);
    const y = r * (cellH + GAP);
    svg += `<rect x="0" y="${y}" width="${row.length * cellW}" height="${cellH}" rx="${cellW * 0.2}" fill="#f8f8f8"/>`;
    row.forEach((char, i) => {
      const x = i * cellW;
      if (i > 0) svg += `<line x1="${x}" y1="${y}" x2="${x}" y2="${y + cellH}" stroke="#e0e0e0"/>`;
      svg += `<text x="${x + cellW / 2}" y="${y + cellH / 2}" fill="${colorOf(char)}" text-anchor="middle" dominant-baseline="central">${escapeXml(VISIBLE[char] ?? char)}</text>`;
    });
  }
  const doc =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${box.width}" height="${height}" viewBox="0 0 ${box.width} ${height}" ` +
    `font-family="Menlo, ui-monospace, monospace" font-size="${fontSize}" font-weight="500">${svg}</svg>`;
  return `![Text](data:image/svg+xml;base64,${Buffer.from(doc).toString("base64")})`;
}
